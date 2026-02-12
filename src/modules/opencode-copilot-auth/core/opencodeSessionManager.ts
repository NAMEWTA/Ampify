import * as cp from 'child_process';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { ManagedOpencodeSession } from '../../../common/types';
import { OpenCodeCopilotAuthConfigManager } from './configManager';

export type SessionSource = 'managed' | 'external';

export interface OpencodeSessionView {
    id: string;
    source: SessionSource;
    name: string;
    pid: number;
    command: string;
    startedAt?: number;
    status: 'running' | 'stopped';
    openable: boolean;
    managedSessionId?: string;
    terminalName?: string;
}

interface RunningProcessInfo {
    pid: number;
    command: string;
    startedAt?: number;
}

export class OpencodeSessionManager {
    constructor(private readonly configManager: OpenCodeCopilotAuthConfigManager) {}

    async startSession(): Promise<ManagedOpencodeSession> {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const id = randomUUID();
        const terminalName = `opencode-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const workspaceArg = workspace ? ` "${workspace.replace(/"/g, '\\"')}"` : '';
        const command = `opencode --port 0${workspaceArg}`;

        const terminal = vscode.window.createTerminal({
            name: terminalName,
            cwd: workspace
        });

        terminal.show();
        terminal.sendText(command);

        const pid = await resolveProcessId(terminal);

        const session: ManagedOpencodeSession = {
            id,
            terminalName,
            pid,
            startedAt: Date.now(),
            command,
            status: 'running',
            workspace
        };

        this.configManager.upsertManagedSession(session);
        return session;
    }

    async openManagedSession(sessionId: string): Promise<boolean> {
        const managed = this.configManager.getManagedSessions().find((item) => item.id === sessionId);
        if (!managed) {
            return false;
        }

        const terminal = vscode.window.terminals.find((item) => item.name === managed.terminalName);
        if (!terminal) {
            return false;
        }

        terminal.show();
        return true;
    }

    async killByPid(pid: number): Promise<void> {
        try {
            process.kill(pid);
            return;
        } catch {
            // Fallback for Windows process tree termination.
        }

        if (process.platform === 'win32') {
            cp.execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            return;
        }

        cp.execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }

    async killManagedSession(sessionId: string): Promise<void> {
        const managed = this.configManager.getManagedSessions().find((item) => item.id === sessionId);
        if (!managed) {
            return;
        }

        const terminal = vscode.window.terminals.find((item) => item.name === managed.terminalName);
        if (terminal) {
            terminal.dispose();
        }

        if (managed.pid) {
            try {
                await this.killByPid(managed.pid);
            } catch {
                // noop
            }
        }

        this.configManager.removeManagedSession(managed.id);
    }

    async getSessionViews(): Promise<OpencodeSessionView[]> {
        const running = this.scanRunningProcesses();
        const managed = this.configManager.getManagedSessions();
        const terminals = vscode.window.terminals;
        const terminalNameSet = new Set(terminals.map((item) => item.name));
        const runningByPid = new Map<number, RunningProcessInfo>();
        const consumedPidSet = new Set<number>();
        const views: OpencodeSessionView[] = [];
        const nextManaged: ManagedOpencodeSession[] = [];

        for (const proc of running) {
            runningByPid.set(proc.pid, proc);
        }

        for (const session of managed) {
            const terminalAlive = terminalNameSet.has(session.terminalName);
            let matchedProc: RunningProcessInfo | undefined;

            if (session.pid && runningByPid.has(session.pid)) {
                matchedProc = runningByPid.get(session.pid);
            } else if (terminalAlive) {
                matchedProc = matchRunningProcessByStartTime(running, consumedPidSet, session.startedAt);
            }

            if (matchedProc) {
                consumedPidSet.add(matchedProc.pid);
            }

            const isRunning = terminalAlive || Boolean(matchedProc);
            if (!isRunning) {
                continue;
            }

            const resolvedPid = matchedProc?.pid ?? session.pid;
            const resolvedCommand = matchedProc?.command ?? session.command;
            const resolvedStartedAt = matchedProc?.startedAt ?? session.startedAt;

            const updatedSession: ManagedOpencodeSession = {
                ...session,
                pid: resolvedPid,
                command: resolvedCommand,
                startedAt: resolvedStartedAt || session.startedAt,
                status: 'running'
            };
            nextManaged.push(updatedSession);

            views.push({
                id: `managed-${session.id}`,
                source: 'managed',
                name: session.terminalName,
                pid: resolvedPid || 0,
                command: resolvedCommand,
                startedAt: resolvedStartedAt,
                status: 'running',
                openable: terminalAlive,
                managedSessionId: session.id,
                terminalName: session.terminalName
            });
        }

        for (const proc of running) {
            if (consumedPidSet.has(proc.pid)) {
                continue;
            }
            views.push({
                id: `external-${proc.pid}`,
                source: 'external',
                name: `opencode (${proc.pid})`,
                pid: proc.pid,
                command: proc.command,
                startedAt: proc.startedAt,
                status: 'running',
                openable: false,
            });
        }

        this.configManager.setManagedSessions(nextManaged);

        views.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
        return views;
    }

    private scanRunningProcesses(): RunningProcessInfo[] {
        try {
            if (process.platform === 'win32') {
                return this.scanWindowsProcesses();
            }
            return this.scanUnixProcesses();
        } catch (error) {
            console.error('Failed to scan opencode processes:', error);
            return [];
        }
    }

    private scanWindowsProcesses(): RunningProcessInfo[] {
        const command = [
            'powershell',
            '-NoProfile',
            '-Command',
            `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match '(?i)\\bopencode(\\.cmd)?\\b') -and ($_.CommandLine -notmatch 'Get-CimInstance Win32_Process') } | Select-Object ProcessId,CommandLine,CreationDate | ConvertTo-Json -Compress`
        ].join(' ');

        const output = cp.execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (!output) {
            return [];
        }

        const parsed = JSON.parse(output) as Record<string, unknown> | Array<Record<string, unknown>>;
        const rows = Array.isArray(parsed) ? parsed : [parsed];

        const result: RunningProcessInfo[] = [];
        for (const row of rows) {
            const pid = Number(row.ProcessId);
            const cmd = typeof row.CommandLine === 'string' ? row.CommandLine : '';
            if (!Number.isFinite(pid) || pid <= 0 || !isOpencodeCommand(cmd)) {
                continue;
            }
            const startedAt = typeof row.CreationDate === 'string' ? Date.parse(row.CreationDate) : undefined;
            result.push({
                pid,
                command: cmd,
                startedAt: Number.isFinite(startedAt || NaN) ? startedAt : undefined
            });
        }

        return dedupeByPid(result);
    }

    private scanUnixProcesses(): RunningProcessInfo[] {
        const command = `ps -ax -o pid=,lstart=,command= | grep -E "[o]pencode"`;
        const output = cp.execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (!output) {
            return [];
        }

        const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const result: RunningProcessInfo[] = [];

        for (const line of lines) {
            const pidMatch = line.match(/^(\d+)\s+/);
            if (!pidMatch) {
                continue;
            }

            const pid = Number(pidMatch[1]);
            if (!Number.isFinite(pid) || pid <= 0) {
                continue;
            }

            const rest = line.slice(pidMatch[0].length);
            const maybeDate = rest.slice(0, 24);
            const startedAtParsed = Date.parse(maybeDate);
            const commandPart = Number.isFinite(startedAtParsed)
                ? rest.slice(24).trim()
                : rest.trim();

            if (!isOpencodeCommand(commandPart)) {
                continue;
            }

            result.push({
                pid,
                command: commandPart,
                startedAt: Number.isFinite(startedAtParsed) ? startedAtParsed : undefined
            });
        }

        return dedupeByPid(result);
    }
}

function dedupeByPid(items: RunningProcessInfo[]): RunningProcessInfo[] {
    const map = new Map<number, RunningProcessInfo>();
    for (const item of items) {
        map.set(item.pid, item);
    }
    return [...map.values()];
}

function matchRunningProcessByStartTime(
    running: RunningProcessInfo[],
    consumedPidSet: Set<number>,
    startedAt?: number
): RunningProcessInfo | undefined {
    const candidates = running.filter((proc) => !consumedPidSet.has(proc.pid));
    if (candidates.length === 0) {
        return undefined;
    }

    if (!startedAt) {
        return candidates[0];
    }

    let best: RunningProcessInfo | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        if (!candidate.startedAt) {
            continue;
        }
        const distance = Math.abs(candidate.startedAt - startedAt);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = candidate;
        }
    }

    return best || candidates[0];
}

function isOpencodeCommand(command: string): boolean {
    if (!command) {
        return false;
    }
    return /\bopencode(\.cmd)?\b/i.test(command);
}

async function resolveProcessId(terminal: vscode.Terminal): Promise<number | undefined> {
    const start = Date.now();
    const timeoutMs = 4000;

    while (Date.now() - start < timeoutMs) {
        const pid = await terminal.processId;
        if (pid && pid > 0) {
            return pid;
        }
        await delay(200);
    }

    return undefined;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
