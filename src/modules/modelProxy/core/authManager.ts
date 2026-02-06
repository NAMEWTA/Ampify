/**
 * API Key 管理器
 * 负责生成、验证和重新生成 API Key
 */
import * as crypto from 'crypto';
import * as http from 'http';

const KEY_PREFIX = 'amp-';

export class AuthManager {
    /**
     * 生成新的 API Key
     * 格式: amp-<64个hex字符>
     */
    static generateKey(): string {
        const random = crypto.randomBytes(32).toString('hex');
        return `${KEY_PREFIX}${random}`;
    }

    /**
     * 从 HTTP 请求中提取 API Key
     * 支持两种方式：
     * - Authorization: Bearer <key> (OpenAI 风格)
     * - x-api-key: <key> (Anthropic 风格)
     */
    static extractKey(req: http.IncomingMessage): string | null {
        // 尝试 Bearer token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7).trim();
        }

        // 尝试 x-api-key
        const apiKeyHeader = req.headers['x-api-key'];
        if (apiKeyHeader) {
            return (Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader).trim();
        }

        return null;
    }

    /**
     * 验证请求中的 API Key 是否匹配
     */
    static validateRequest(req: http.IncomingMessage, expectedKey: string): boolean {
        const key = AuthManager.extractKey(req);
        if (!key || !expectedKey) {
            return false;
        }
        // 使用 timingSafeEqual 防止时序攻击
        try {
            const a = Buffer.from(key, 'utf8');
            const b = Buffer.from(expectedKey, 'utf8');
            if (a.length !== b.length) {
                return false;
            }
            return crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }
}
