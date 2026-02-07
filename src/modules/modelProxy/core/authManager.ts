/**
 * API Key 管理器
 * 负责生成、验证和重新生成 API Key
 */
import * as crypto from 'crypto';
import * as http from 'http';
import { ApiKeyBinding, AuthResult } from '../../../common/types';

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
     * 验证请求中的 API Key 是否匹配某个绑定
     * 返回 AuthResult，包含匹配到的绑定信息
     */
    static validateRequest(req: http.IncomingMessage, bindings: ApiKeyBinding[]): AuthResult {
        const key = AuthManager.extractKey(req);
        if (!key || bindings.length === 0) {
            return { valid: false };
        }

        const keyBuf = Buffer.from(key, 'utf8');

        for (const binding of bindings) {
            if (!binding.apiKey) { continue; }
            try {
                const expectedBuf = Buffer.from(binding.apiKey, 'utf8');
                if (keyBuf.length !== expectedBuf.length) {
                    continue;
                }
                if (crypto.timingSafeEqual(keyBuf, expectedBuf)) {
                    return { valid: true, binding };
                }
            } catch {
                continue;
            }
        }

        return { valid: false };
    }
}
