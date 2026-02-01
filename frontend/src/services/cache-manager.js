/**
 * Cache Manager - IndexedDB-based cache layer
 * Provides persistent caching for API responses
 */

const DB_NAME = 'book-tracker-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

class CacheManager {
    constructor() {
        this._db = null;
        this._dbPromise = null;
    }

    /**
     * Initialize the database
     * @returns {Promise<IDBDatabase>}
     */
    async _getDb() {
        if (this._db) return this._db;

        if (this._dbPromise) return this._dbPromise;

        this._dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create cache store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });

        return this._dbPromise;
    }

    /**
     * Get a cached item
     * @param {string} key - Cache key
     * @returns {Promise<*|null>}
     */
    async get(key) {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        resolve(result.value);
                    } else {
                        resolve(null);
                    }
                };
            });
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set a cached item
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     * @returns {Promise<void>}
     */
    async set(key, value, ttl = null) {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                const item = {
                    key,
                    value,
                    timestamp: Date.now(),
                    expiresAt: ttl ? Date.now() + ttl : null
                };

                const request = store.put(item);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Delete a cached item
     * @param {string} key - Cache key
     * @returns {Promise<void>}
     */
    async delete(key) {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    /**
     * Delete all items with a key prefix
     * @param {string} prefix - Key prefix
     * @returns {Promise<void>}
     */
    async deleteByPrefix(prefix) {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.openCursor();

                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        if (cursor.key.startsWith(prefix)) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            });
        } catch (error) {
            console.error('Cache deleteByPrefix error:', error);
        }
    }

    /**
     * Clear all cached items
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Clean up expired items
     * @returns {Promise<number>} Number of items removed
     */
    async cleanup() {
        try {
            const db = await this._getDb();
            const now = Date.now();
            let removed = 0;

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.openCursor();

                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const item = cursor.value;
                        if (item.expiresAt && item.expiresAt < now) {
                            cursor.delete();
                            removed++;
                        }
                        cursor.continue();
                    } else {
                        resolve(removed);
                    }
                };
            });
        } catch (error) {
            console.error('Cache cleanup error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            const db = await this._getDb();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const countRequest = store.count();

                countRequest.onerror = () => reject(countRequest.error);
                countRequest.onsuccess = () => {
                    resolve({
                        itemCount: countRequest.result,
                        dbName: DB_NAME,
                        storeName: STORE_NAME
                    });
                };
            });
        } catch (error) {
            console.error('Cache stats error:', error);
            return { itemCount: 0, dbName: DB_NAME, storeName: STORE_NAME };
        }
    }
}

// Export singleton
export const cacheManager = new CacheManager();

// Run cleanup periodically (every 5 minutes)
setInterval(() => {
    cacheManager.cleanup();
}, 5 * 60 * 1000);
