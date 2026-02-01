/**
 * Offline Queue - Queue mutations when offline and sync when back online
 */

import { store } from '../core/store.js';
import { events, EVENT_NAMES } from '../core/events.js';
import { api } from './api-client.js';

const DB_NAME = 'book-tracker-offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

class OfflineQueue {
    constructor() {
        this._db = null;
        this._dbPromise = null;
        this._syncing = false;

        // Listen for online/offline events
        window.addEventListener('online', () => this._handleOnline());
        window.addEventListener('offline', () => this._handleOffline());

        // Initialize online state
        store.set('isOnline', navigator.onLine);
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
                console.error('Failed to open offline queue DB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });

        return this._dbPromise;
    }

    /**
     * Add a mutation to the queue
     * @param {string} type - Mutation type (e.g., 'book:update', 'book:create')
     * @param {Object} data - Mutation data
     * @returns {Promise<number>} Mutation ID
     */
    async add(type, data) {
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const mutation = {
                type,
                data,
                timestamp: Date.now(),
                retries: 0
            };

            const request = store.add(mutation);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const id = request.result;
                this._updatePendingCount();
                resolve(id);
            };
        });
    }

    /**
     * Get all pending mutations
     * @returns {Promise<Array>}
     */
    async getAll() {
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Remove a mutation from the queue
     * @param {number} id - Mutation ID
     * @returns {Promise<void>}
     */
    async remove(id) {
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this._updatePendingCount();
                resolve();
            };
        });
    }

    /**
     * Update a mutation's retry count
     * @param {number} id - Mutation ID
     * @param {number} retries - New retry count
     * @returns {Promise<void>}
     */
    async updateRetries(id, retries) {
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const mutation = getRequest.result;
                if (mutation) {
                    mutation.retries = retries;
                    const putRequest = store.put(mutation);
                    putRequest.onerror = () => reject(putRequest.error);
                    putRequest.onsuccess = () => resolve();
                } else {
                    resolve();
                }
            };
        });
    }

    /**
     * Clear all mutations
     * @returns {Promise<void>}
     */
    async clear() {
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this._updatePendingCount();
                resolve();
            };
        });
    }

    /**
     * Sync all pending mutations
     * @returns {Promise<Object>} Sync results
     */
    async sync() {
        if (this._syncing || !navigator.onLine) {
            return { synced: 0, failed: 0 };
        }

        this._syncing = true;
        events.emit(EVENT_NAMES.SYNC_START);

        const mutations = await this.getAll();
        let synced = 0;
        let failed = 0;

        for (const mutation of mutations) {
            try {
                await this._executeMutation(mutation);
                await this.remove(mutation.id);
                synced++;
            } catch (error) {
                console.error('Mutation sync error:', error);

                // Retry up to 3 times
                if (mutation.retries < 3) {
                    await this.updateRetries(mutation.id, mutation.retries + 1);
                } else {
                    // Give up after 3 retries
                    await this.remove(mutation.id);
                    failed++;
                }
            }
        }

        this._syncing = false;

        if (failed > 0) {
            events.emit(EVENT_NAMES.SYNC_ERROR, { synced, failed });
        } else {
            events.emit(EVENT_NAMES.SYNC_COMPLETE, { synced, failed });
        }

        return { synced, failed };
    }

    /**
     * Execute a single mutation
     * @param {Object} mutation
     * @returns {Promise<*>}
     */
    async _executeMutation(mutation) {
        const { type, data } = mutation;

        switch (type) {
            case 'book:create':
                return api.createBook(data);

            case 'book:update':
                return api.updateBook(data.id, data.updates);

            case 'book:delete':
                return api.delete(`/books/${data.id}`);

            case 'path:create':
                return api.createPath(data);

            case 'path:update':
                return api.updatePath(data.id, data.updates);

            case 'path:delete':
                return api.deletePath(data.id);

            case 'path:addBook':
                return api.addBookToPath(data.pathId, data.userBookId);

            case 'path:removeBook':
                return api.removeBookFromPath(data.pathId, data.userBookId);

            default:
                throw new Error(`Unknown mutation type: ${type}`);
        }
    }

    /**
     * Update the pending mutations count in store
     */
    async _updatePendingCount() {
        const mutations = await this.getAll();
        store.set('pendingMutations', mutations);
    }

    /**
     * Handle coming back online
     */
    async _handleOnline() {
        store.set('isOnline', true);
        events.emit(EVENT_NAMES.ONLINE);

        // Auto-sync when coming back online
        await this.sync();
    }

    /**
     * Handle going offline
     */
    _handleOffline() {
        store.set('isOnline', false);
        events.emit(EVENT_NAMES.OFFLINE);
    }

    /**
     * Queue a mutation (wrapper for offline support)
     * If online, execute immediately. If offline, queue for later.
     * @param {string} type - Mutation type
     * @param {Function} onlineAction - Function to call when online
     * @param {Object} offlineData - Data to queue when offline
     * @returns {Promise<*>}
     */
    async queueOrExecute(type, onlineAction, offlineData) {
        if (navigator.onLine) {
            try {
                return await onlineAction();
            } catch (error) {
                // If it's a network error, queue it
                if (error.message.includes('Failed to fetch') ||
                    error.message.includes('Network')) {
                    await this.add(type, offlineData);
                    events.emit(EVENT_NAMES.OFFLINE);
                    throw error;
                }
                throw error;
            }
        } else {
            await this.add(type, offlineData);
            return { queued: true };
        }
    }
}

// Export singleton
export const offlineQueue = new OfflineQueue();

// Initialize and load pending count
offlineQueue._updatePendingCount();
