import { createClient } from 'redis';
import { env } from './env';
import { coreLogger } from '../middlewares/logger.middleware';

type SimpleRedisClient = ReturnType<typeof createClient>;

let redisClient: SimpleRedisClient | null = null;
let redisConnectPromise: Promise<SimpleRedisClient | null> | null = null;

/**
 * 获取 Redis 客户端（惰性连接，失败时返回 null 由调用方决定降级策略）。
 */
export const getRedisClient = async (): Promise<SimpleRedisClient | null> => {
  if (redisClient) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    const client = createClient({
      url: env.REDIS_URL
    });

    client.on('error', (error) => {
      coreLogger.warn(
        {
          feature: 'redis',
          message: error?.message
        },
        'Redis client error'
      );
    });

    try {
      await client.connect();
      redisClient = client;
      return redisClient;
    } catch (error: any) {
      coreLogger.warn(
        {
          feature: 'redis',
          reason: error?.message ?? 'connect_failed'
        },
        'Redis connect failed, caller should fallback'
      );
      try {
        await client.disconnect();
      } catch {
        // ignore
      }
      redisClient = null;
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
};
