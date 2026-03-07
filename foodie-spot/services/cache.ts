import { storage } from './storage';

const CACHED_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedItem<T> {
    data: T;
    timestamp: number;
}

export const cache = {

    async set<T>(key: string, data: T): Promise<void> {
        const cachedItem: CachedItem<T> = {
            data,
            timestamp: Date.now(),
        };
        await storage.setItem(`cache_${key}`, JSON.stringify(cachedItem));
    },

    async get<T>(key: string): Promise<T | null> {

        const cachedItem = await storage.getItem<CachedItem<T>>(`cache_${key}`);

        if (!cachedItem) {
            return null;
        }

        const isExpired = Date.now() - cachedItem.timestamp > CACHED_DURATION;

        if (isExpired) {
            // log.debug(`Cache expired for ${key}`);
            await storage.removeItem(`cache_${key}`);
            return null;
        }

        return cachedItem.data;
    },
    async clear(key: string): Promise<void> {
        await storage.removeItem(`cache_${key}`);
    },
    async clearAll(): Promise<void> {
        const keys = await storage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith('cache_'));

        for (const key of cacheKeys) {
            await storage.removeItem(key);
        }
    }
}