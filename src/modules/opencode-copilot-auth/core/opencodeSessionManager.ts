import * as cp from 'child_process';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { ManagedOpencodeSession } from '../../../common/types';
import { OpenCodeCopilotAuthConfigManager } from './configManager';

export type SessionSource = 'managed';

export interface OpencodeSessionView {
    id: string;
    source: SessionSource;
    name: string;
    pid: number;
    command: string;
    startedAt?: number;
    workspace?: string;
    status: 'running' | 'stopped';
    openable: boolean;
    managedSessionId?: string;
    terminalName?: string;
    launchMode: 'externalTerminal';
    activeProvidersSnapshot?: string[];
    activeOhMyNameSnapshot?: string;
}

export class OpencodeSessionManager {
    constructor(private readonly configManager: OpenCodeCopilotAuthConfigManager) {}

    async startSession(): Promise<ManagedOpencodeSession> {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const id = randomUUID();
        const terminalName = `opencode-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const command = buildOpencodeCommand(workspace);
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

    async killByPid(pid: number): Promise<void> {
        if (!pid || pid <= 0) {
            return;
        }

        try {
            process.kill(pid);
            return;
        } catch {
            // Fallback for process tree termination.
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
                // Ignore kill errors; terminal dispose is already attempted.
            }
        }

        this.configManager.removeManagedSession(managed.id);
    }

    async getSessionViews(): Promise<OpencodeSessionView[]> {
        const sessions = this.configManager.getManagedSessions();
        const terminalNameSet = new Set(vscode.window.terminals.map((item) => item.name));
        const views: OpencodeSessionView[] = [];
        const nextManaged: ManagedOpencodeSession[] = [];

        for (const session of sessions) {
            const terminalAlive = terminalNameSet.has(session.terminalName);
            const pidAlive = Boolean(session.pid && isPidRunning(session.pid));
            const running = terminalAlive || pidAlive;
            if (!running) {
                continue;
            }

            const updated: ManagedOpencodeSession = {
                ...session,
                launchMode: 'externalTerminal',
                status: 'running'
            };
            nextManaged.push(updated);

            views.push({
                id: `managed-${session.id}`,
                source: 'managed',
                name: session.terminalName,
                pid: session.pid || 0,
                command: session.command,
                startedAt: session.startedAt,
                workspace: session.workspace,
                status: 'running',
                openable: terminalAlive,
                managedSessionId: session.id,
                terminalName: session.terminalName,
                launchMode: 'externalTerminal',
                activeProvidersSnapshot: session.activeProvidersSnapshot || [],
                activeOhMyNameSnapshot: session.activeOhMyNameSnapshot
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
}

function buildOpencodeCommand(workspace?: string): string {
    if (!workspace) {
        return 'opencode --port 0';
    }
    const escaped = workspace.replace(/"/g, '\\"');
    return `opencode --port 0 "${escaped}"`;
}

async function resolveProcessId(terminal: vscode.Terminal): Promise<number | undefined> {
    const start = Date.now();
    const timeoutMs = 4000;

    while (Date.now() - start < timeoutMs) {
        const pid = await terminal.processId;
        if (pid && pid > 0) {
            return pid;
        }
        await delay(180);
    }

    return undefined;
}

function isPidRunning(pid: number): boolean {
    if (!pid || pid <= 0) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error
            ? (error as { code?: string }).code
            : undefined;
        return code === 'EPERM';
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
