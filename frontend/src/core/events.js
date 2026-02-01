/**
 * Events - Pub/Sub event bus for cross-component communication
 */

class EventBus {
    constructor() {
        this._listeners = new Map();
        this._onceListeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, new Set());
        }
        this._onceListeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }

        const onceListeners = this._onceListeners.get(event);
        if (onceListeners) {
            onceListeners.delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        // Call regular listeners
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for "${event}":`, error);
                }
            });
        }

        // Call once listeners and remove them
        const onceListeners = this._onceListeners.get(event);
        if (onceListeners) {
            onceListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Once event listener error for "${event}":`, error);
                }
            });
            this._onceListeners.delete(event);
        }

        // Also emit wildcard event
        if (event !== '*') {
            this.emit('*', { event, data });
        }
    }

    /**
     * Clear all listeners for an event
     * @param {string} event - Event name
     */
    clear(event) {
        this._listeners.delete(event);
        this._onceListeners.delete(event);
    }

    /**
     * Clear all listeners
     */
    clearAll() {
        this._listeners.clear();
        this._onceListeners.clear();
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        const regular = this._listeners.get(event)?.size || 0;
        const once = this._onceListeners.get(event)?.size || 0;
        return regular + once;
    }
}

// Create and export singleton
export const events = new EventBus();

// Pre-defined event names for consistency
export const EVENT_NAMES = {
    // Route events
    ROUTE_CHANGE: 'route:change',
    ROUTE_BEFORE: 'route:before',

    // Auth events
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_ERROR: 'auth:error',

    // Data events
    BOOKS_LOADED: 'books:loaded',
    BOOKS_UPDATED: 'books:updated',
    BOOK_CREATED: 'book:created',
    BOOK_UPDATED: 'book:updated',
    BOOK_DELETED: 'book:deleted',

    PATHS_LOADED: 'paths:loaded',
    PATH_CREATED: 'path:created',
    PATH_UPDATED: 'path:updated',
    PATH_DELETED: 'path:deleted',

    DASHBOARD_LOADED: 'dashboard:loaded',
    PIPELINE_LOADED: 'pipeline:loaded',

    // UI events
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    TOAST_SHOW: 'toast:show',

    // Offline events
    ONLINE: 'network:online',
    OFFLINE: 'network:offline',
    SYNC_START: 'sync:start',
    SYNC_COMPLETE: 'sync:complete',
    SYNC_ERROR: 'sync:error'
};
