import * as cp from 'child_process';
import * as http from 'http';
import * as net from 'net';
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
    launchMode: 'externalTerminal' | 'internalWeb';
    internalUrl?: string;
    minimized?: boolean;
    activeProvidersSnapshot?: string[];
    activeOhMyNameSnapshot?: string;
}

interface RunningProcessInfo {
    pid: number;
    command: string;
    startedAt?: number;
}

const INTERNAL_HOST = '127.0.0.1';
const INTERNAL_READY_TIMEOUT_MS = 12000;
const INTERNAL_READY_RETRY_INTERVAL_MS = 250;

export class OpencodeSessionManager {
    constructor(private readonly configManager: OpenCodeCopilotAuthConfigManager) {}

    async startSession(): Promise<ManagedOpencodeSession> {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const id = randomUUID();
        const terminalName = `opencode-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const workspaceArg = workspace ? ` "${workspace.replace(/"/g, '\\"')}"` : '';
        const command = `opencode --port 0${workspaceArg}`;
        const snapshots = this.buildSessionSnapshots();

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
            launchMode: 'externalTerminal',
            pid,
            startedAt: Date.now(),
            command,
            status: 'running',
            workspace,
            activeProvidersSnapshot: snapshots.activeProvidersSnapshot,
            activeOhMyProfileIdSnapshot: snapshots.activeOhMyProfileIdSnapshot,
            activeOhMyNameSnapshot: snapshots.activeOhMyNameSnapshot
        };

        this.configManager.upsertManagedSession(session);
        return session;
    }

    async startInternalSession(): Promise<ManagedOpencodeSession> {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const id = randomUUID();
        const port = await findFreePort();
        const terminalName = `opencode-internal-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const command = `opencode serve --hostname ${INTERNAL_HOST} --port ${port}`;
        const internalUrl = `http://${INTERNAL_HOST}:${port}`;
        const snapshots = this.buildSessionSnapshots();

        const child = cp.spawn(getOpencodeExecutable(), [
            'serve',
            '--hostname',
            INTERNAL_HOST,
            '--port',
            String(port)
        ], {
            cwd: workspace,
            windowsHide: true,
            stdio: 'ignore'
        });

        const pid = await waitForSpawnedPid(child);
        child.unref();

        try {
            await waitForHttpReady(internalUrl, INTERNAL_READY_TIMEOUT_MS);
        } catch (error) {
            try {
                await this.killByPid(pid);
            } catch {
                // noop
            }
            throw error;
        }

        const session: ManagedOpencodeSession = {
            id,
            terminalName,
            launchMode: 'internalWeb',
            pid,
            startedAt: Date.now(),
            command,
            status: 'running',
            workspace,
            port,
            internalUrl,
            minimized: false,
            activeProvidersSnapshot: snapshots.activeProvidersSnapshot,
            activeOhMyProfileIdSnapshot: snapshots.activeOhMyProfileIdSnapshot,
            activeOhMyNameSnapshot: snapshots.activeOhMyNameSnapshot
        };

        this.configManager.upsertManagedSession(session);
        this.configManager.minimizeOtherInternalSessions(session.id);
        this.configManager.setInternalSessionMinimized(session.id, false);

        return this.configManager.getManagedSessions().find((item) => item.id === session.id) || session;
    }

    async openManagedSession(sessionId: string): Promise<boolean> {
        const managed = this.configManager.getManagedSessions().find((item) => item.id === sessionId);
        if (!managed || managed.launchMode !== 'externalTerminal') {
            return false;
        }

        const terminal = vscode.window.terminals.find((item) => item.name === managed.terminalName);
        if (!terminal) {
            return false;
        }

        terminal.show();
        return true;
    }

    async openInternalSession(sessionId: string): Promise<boolean> {
        const views = await this.getSessionViews();
        const target = views.find((item) =>
            item.source === 'managed'
            && item.managedSessionId === sessionId
            && item.launchMode === 'internalWeb'
            && item.status === 'running'
        );

        if (!target) {
            return false;
        }

        this.configManager.minimizeOtherInternalSessions(sessionId);
        return this.configManager.setInternalSessionMinimized(sessionId, false);
    }

    async minimizeInternalSession(sessionId: string): Promise<boolean> {
        const managed = this.configManager.getManagedSessions().find((item) => item.id === sessionId);
        if (!managed || managed.launchMode !== 'internalWeb') {
            return false;
        }
        return this.configManager.setInternalSessionMinimized(sessionId, true);
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

        if (managed.launchMode === 'externalTerminal') {
            const terminal = vscode.window.terminals.find((item) => item.name === managed.terminalName);
            if (terminal) {
                terminal.dispose();
            }
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
            let matchedProc: RunningProcessInfo | undefined;
            const terminalAlive = session.launchMode === 'externalTerminal' && terminalNameSet.has(session.terminalName);

            if (session.launchMode === 'externalTerminal') {
                if (session.pid && runningByPid.has(session.pid)) {
                    matchedProc = runningByPid.get(session.pid);
                } else if (terminalAlive) {
                    matchedProc = matchRunningProcessByStartTime(running, consumedPidSet, session.startedAt);
                }
            } else {
                matchedProc = resolveInternalRunningProcess(session, running, runningByPid, consumedPidSet);
            }

            if (matchedProc) {
                consumedPidSet.add(matchedProc.pid);
            }

            const isRunning = session.launchMode === 'externalTerminal'
                ? (terminalAlive || Boolean(matchedProc))
                : Boolean(matchedProc);
            if (!isRunning) {
                continue;
            }

            const resolvedPid = matchedProc?.pid ?? session.pid;
            const resolvedCommand = matchedProc?.command ?? session.command;
            const resolvedStartedAt = matchedProc?.startedAt ?? session.startedAt;
            const internalUrl = session.launchMode === 'internalWeb'
                ? (session.internalUrl || (session.port ? `http://${INTERNAL_HOST}:${session.port}` : undefined))
                : undefined;

            const updatedSession: ManagedOpencodeSession = {
                ...session,
                pid: resolvedPid,
                command: resolvedCommand,
                startedAt: resolvedStartedAt || session.startedAt,
                status: 'running',
                internalUrl
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
                terminalName: session.terminalName,
                launchMode: session.launchMode,
                internalUrl,
                minimized: session.launchMode === 'internalWeb' ? session.minimized !== false : undefined,
                activeProvidersSnapshot: session.activeProvidersSnapshot || [],
                activeOhMyNameSnapshot: session.activeOhMyNameSnapshot
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
                launchMode: 'externalTerminal'
            });
        }

        this.configManager.setManagedSessions(nextManaged);

        views.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
        return views;
    }

    private buildSessionSnapshots(): Pick<ManagedOpencodeSession, 'activeProvidersSnapshot' | 'activeOhMyProfileIdSnapshot' | 'activeOhMyNameSnapshot'> {
        const activeMap = this.configManager.getActiveByProviderMap();
        const credentialIds = new Set(this.configManager.getCredentials().map((item) => item.id));
        const activeProvidersSnapshot = Object.entries(activeMap)
            .filter(([, credentialId]) => typeof credentialId === 'string' && credentialIds.has(credentialId))
            .map(([provider]) => provider)
            .sort();

        const activeOhMyProfileIdSnapshot = this.configManager.getActiveOhMyProfileId();
        const activeOhMyNameSnapshot = activeOhMyProfileIdSnapshot
            ? this.configManager.getOhMyProfileById(activeOhMyProfileIdSnapshot)?.name
            : undefined;

        return {
            activeProvidersSnapshot,
            activeOhMyProfileIdSnapshot,
            activeOhMyNameSnapshot
        };
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
            `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match '(?i)\\bopencode(\\.cmd|\\.exe)?\\b') -and ($_.CommandLine -notmatch 'Get-CimInstance Win32_Process') } | Select-Object ProcessId,CommandLine,CreationDate | ConvertTo-Json -Compress`
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
        const command = 'ps -ax -o pid=,lstart=,command= | grep -E "[o]pencode"';
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

function resolveInternalRunningProcess(
    session: ManagedOpencodeSession,
    running: RunningProcessInfo[],
    runningByPid: Map<number, RunningProcessInfo>,
    consumedPidSet: Set<number>
): RunningProcessInfo | undefined {
    if (session.pid && runningByPid.has(session.pid)) {
        return runningByPid.get(session.pid);
    }

    if (session.port) {
        const byPort = findRunningProcessByPort(running, consumedPidSet, session.port);
        if (byPort) {
            return byPort;
        }
    }

    const serveOnly = running.filter((item) => isOpencodeServeCommand(item.command));
    return matchRunningProcessByStartTime(serveOnly, consumedPidSet, session.startedAt);
}

function findRunningProcessByPort(
    running: RunningProcessInfo[],
    consumedPidSet: Set<number>,
    port: number
): RunningProcessInfo | undefined {
    for (const proc of running) {
        if (consumedPidSet.has(proc.pid)) {
            continue;
        }
        if (!isPortInCommand(proc.command, port)) {
            continue;
        }
        return proc;
    }
    return undefined;
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
    return /\bopencode(\.cmd|\.exe)?\b/i.test(command);
}

function isOpencodeServeCommand(command: string): boolean {
    if (!isOpencodeCommand(command)) {
        return false;
    }
    return /\bserve\b/i.test(command);
}

function isPortInCommand(command: string, port: number): boolean {
    if (!command || !port) {
        return false;
    }
    const pattern = new RegExp(`--port\\s+${port}\\b`);
    return pattern.test(command);
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

function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, INTERNAL_HOST, () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('Failed to allocate internal opencode port')));
                return;
            }

            const { port } = address;
            server.close((closeError) => {
                if (closeError) {
                    reject(closeError);
                    return;
                }
                resolve(port);
            });
        });
    });
}

function waitForSpawnedPid(child: cp.ChildProcess): Promise<number> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out while starting internal opencode process'));
        }, 2000);

        const cleanup = () => {
            clearTimeout(timeout);
            child.removeListener('spawn', onSpawn);
            child.removeListener('error', onError);
        };

        const onSpawn = () => {
            cleanup();
            const pid = child.pid;
            if (!pid || pid <= 0) {
                reject(new Error('Internal opencode process did not provide a valid PID'));
                return;
            }
            resolve(pid);
        };

        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };

        child.once('spawn', onSpawn);
        child.once('error', onError);
    });
}

async function waitForHttpReady(url: string, timeoutMs: number): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const ready = await probeHttp(url);
        if (ready) {
            return;
        }
        await delay(INTERNAL_READY_RETRY_INTERVAL_MS);
    }

    throw new Error(`Timed out waiting for internal opencode web UI: ${url}`);
}

function probeHttp(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            res.resume();
            resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 500));
        });
        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
    });
}

function getOpencodeExecutable(): string {
    return process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
