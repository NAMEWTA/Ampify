/**
 * 日志管理器
 * 将代理请求日志写入 JSONL 文件，按日期分割
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ProxyLogEntry } from '../../../common/types';
import { ensureDir } from '../../../common/paths';
import { ProxyConfigManager } from './proxyConfigManager';

export class LogManager {
    private configManager: ProxyConfigManager;

    constructor() {
        this.configManager = ProxyConfigManager.getInstance();
    }

    /**
     * 生成请求 ID
     */
    generateRequestId(): string {
        return crypto.randomUUID();
    }

    /**
     * 记录一条请求日志
     */
    log(entry: ProxyLogEntry): void {
        const config = this.configManager.getConfig();
        if (!config.logEnabled) {
            return;
        }

        try {
            const logsDir = this.configManager.getLogsDir();
            ensureDir(logsDir);

            const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const logFile = path.join(logsDir, `${date}.jsonl`);
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(logFile, line, 'utf8');
        } catch (error) {
            console.error('Failed to write proxy log:', error);
        }
    }

    /**
     * 获取最近 N 条日志
     */
    getRecentLogs(count: number = 10): ProxyLogEntry[] {
        try {
            const logsDir = this.configManager.getLogsDir();
            if (!fs.existsSync(logsDir)) {
                return [];
            }

            // 按日期倒序获取文件
            const files = fs.readdirSync(logsDir)
                .filter(f => f.endsWith('.jsonl'))
                .sort()
                .reverse();

            const entries: ProxyLogEntry[] = [];

            for (const file of files) {
                if (entries.length >= count) { break; }

                const filePath = path.join(logsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(Boolean).reverse();

                for (const line of lines) {
                    if (entries.length >= count) { break; }
                    try {
                        entries.push(JSON.parse(line) as ProxyLogEntry);
                    } catch {
                        // skip invalid lines
                    }
                }
            }

            return entries;
        } catch (error) {
            console.error('Failed to read proxy logs:', error);
            return [];
        }
    }

    /**
     * 获取今日日志统计（含平均延迟）
     */
    getTodayStats(): { requests: number; tokens: number; errors: number; avgLatencyMs: number } {
        try {
            const logsDir = this.configManager.getLogsDir();
            const date = new Date().toISOString().slice(0, 10);
            const logFile = path.join(logsDir, `${date}.jsonl`);

            if (!fs.existsSync(logFile)) {
                return { requests: 0, tokens: 0, errors: 0, avgLatencyMs: 0 };
            }

            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);

            let requests = 0;
            let tokens = 0;
            let errors = 0;
            let totalLatency = 0;

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line) as ProxyLogEntry;
                    requests++;
                    tokens += (entry.inputTokens || 0) + (entry.outputTokens || 0);
                    totalLatency += (entry.durationMs || 0);
                    if (entry.status === 'error') {
                        errors++;
                    }
                } catch {
                    // skip
                }
            }

            return {
                requests,
                tokens,
                errors,
                avgLatencyMs: requests > 0 ? Math.round(totalLatency / requests) : 0
            };
        } catch {
            return { requests: 0, tokens: 0, errors: 0, avgLatencyMs: 0 };
        }
    }
}
