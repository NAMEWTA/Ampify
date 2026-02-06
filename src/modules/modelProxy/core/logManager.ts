/**
 * 日志管理器
 * 将代理请求日志写入 JSONL 文件，按实例 key 分目录，按日期分割
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ProxyLogEntry } from '../../../common/types';
import { ensureDir } from '../../../common/paths';
import { ProxyConfigManager } from './proxyConfigManager';

export class LogManager {
    private configManager: ProxyConfigManager;
    private _instanceKey: string;

    constructor() {
        this.configManager = ProxyConfigManager.getInstance();
        // 延迟读取 instanceKey，因为 extension.ts 中的 detectInstanceKey() 在 activate 时才执行
        this._instanceKey = '';
    }

    /**
     * 获取当前实例 key（懒加载，首次调用时从 extension.ts 读取）
     */
    private getInstanceKey(): string {
        if (!this._instanceKey) {
            try {
                const { instanceKey } = require('../../../extension');
                this._instanceKey = instanceKey || 'main';
            } catch {
                this._instanceKey = 'main';
            }
        }
        return this._instanceKey;
    }

    /**
     * 获取当前实例的日志目录
     */
    getInstanceLogsDir(): string {
        const baseLogsDir = this.configManager.getLogsDir();
        return path.join(baseLogsDir, this.getInstanceKey());
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
            // 注入实例 key
            entry.instanceKey = this.getInstanceKey();

            const logsDir = this.getInstanceLogsDir();
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
     * 获取最近 N 条日志（仅当前实例）
     */
    getRecentLogs(count: number = 10): ProxyLogEntry[] {
        try {
            const logsDir = this.getInstanceLogsDir();
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
     * 获取所有可用的日志文件，按年月日分组（仅当前实例）
     */
    getLogFiles(): { year: string; month: string; day: string; date: string; fileSize: number; entryCount: number }[] {
        try {
            const logsDir = this.getInstanceLogsDir();
            if (!fs.existsSync(logsDir)) {
                return [];
            }

            const files = fs.readdirSync(logsDir)
                .filter(f => f.endsWith('.jsonl'))
                .sort()
                .reverse();

            return files.map(f => {
                const date = f.replace('.jsonl', '');
                const [year, month, day] = date.split('-');
                const filePath = path.join(logsDir, f);
                const stat = fs.statSync(filePath);
                // Quick line count estimate
                let entryCount = 0;
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    entryCount = content.trim().split('\n').filter(Boolean).length;
                } catch { /* ignore */ }

                return { year, month, day, date, fileSize: stat.size, entryCount };
            });
        } catch {
            return [];
        }
    }

    /**
     * 分页查询指定日期文件的日志（仅当前实例）
     * @param date 日期字符串 YYYY-MM-DD
     * @param page 页码（从 1 开始）
     * @param pageSize 每页条数
     * @param statusFilter 状态筛选 'all' | 'success' | 'error'
     * @param keyword 搜索关键词（匹配 model / requestId / error）
     */
    queryLogs(
        date: string,
        page: number = 1,
        pageSize: number = 20,
        statusFilter: 'all' | 'success' | 'error' = 'all',
        keyword?: string
    ): { entries: ProxyLogEntry[]; total: number; page: number; pageSize: number; totalPages: number } {
        try {
            const logsDir = this.getInstanceLogsDir();
            const logFile = path.join(logsDir, `${date}.jsonl`);

            if (!fs.existsSync(logFile)) {
                return { entries: [], total: 0, page, pageSize, totalPages: 0 };
            }

            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);

            // Parse all entries from this file (reversed for newest-first)
            let allEntries: ProxyLogEntry[] = [];
            for (let i = lines.length - 1; i >= 0; i--) {
                try {
                    allEntries.push(JSON.parse(lines[i]) as ProxyLogEntry);
                } catch { /* skip invalid */ }
            }

            // Apply filters
            if (statusFilter !== 'all') {
                allEntries = allEntries.filter(e => e.status === statusFilter);
            }

            if (keyword) {
                const kw = keyword.toLowerCase();
                allEntries = allEntries.filter(e =>
                    (e.model || '').toLowerCase().includes(kw) ||
                    (e.requestId || '').toLowerCase().includes(kw) ||
                    (e.error || '').toLowerCase().includes(kw) ||
                    (e.format || '').toLowerCase().includes(kw)
                );
            }

            const total = allEntries.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(Math.max(1, page), totalPages);
            const start = (safePage - 1) * pageSize;
            const entries = allEntries.slice(start, start + pageSize);

            return { entries, total, page: safePage, pageSize, totalPages };
        } catch (error) {
            console.error('Failed to query logs:', error);
            return { entries: [], total: 0, page, pageSize, totalPages: 0 };
        }
    }

    /**
     * 获取今日日志统计（含平均延迟，仅当前实例）
     */
    getTodayStats(): { requests: number; tokens: number; errors: number; avgLatencyMs: number } {
        try {
            const logsDir = this.getInstanceLogsDir();
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
