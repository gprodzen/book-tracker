/**
 * Store - Reactive state management with subscriptions
 * Provides a centralized store for application state
 */

class Store {
    constructor(initialState = {}) {
        this._state = initialState;
        this._subscribers = new Map();
        this._globalSubscribers = new Set();
    }

    /**
     * Get the entire state
     * @returns {Object}
     */
    getState() {
        return { ...this._state };
    }

    /**
     * Get a specific state value
     * @param {string} key - State key (supports dot notation)
     * @returns {*}
     */
    get(key) {
        return this._getNestedValue(this._state, key);
    }

    /**
     * Set a state value and notify subscribers
     * @param {string} key - State key (supports dot notation)
     * @param {*} value - New value
     */
    set(key, value) {
        const oldValue = this.get(key);
        this._setNestedValue(this._state, key, value);
        this._notify(key, value, oldValue);
    }

    /**
     * Update multiple state values at once
     * @param {Object} updates - Key-value pairs to update
     */
    update(updates) {
        const oldState = { ...this._state };

        Object.entries(updates).forEach(([key, value]) => {
            this._setNestedValue(this._state, key, value);
        });

        // Notify for each changed key
        Object.keys(updates).forEach(key => {
            const oldValue = this._getNestedValue(oldState, key);
            this._notify(key, updates[key], oldValue);
        });
    }

    /**
     * Subscribe to changes for a specific key
     * @param {string} key - State key to watch
     * @param {Function} callback - Function to call on change
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this._subscribers.has(key)) {
            this._subscribers.set(key, new Set());
        }
        this._subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this._subscribers.get(key);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Function to call on any change
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
        this._globalSubscribers.add(callback);
        return () => this._globalSubscribers.delete(callback);
    }

    /**
     * Notify subscribers of a change
     * @param {string} key
     * @param {*} newValue
     * @param {*} oldValue
     */
    _notify(key, newValue, oldValue) {
        // Skip if value hasn't changed
        if (newValue === oldValue) return;

        // Notify key-specific subscribers
        const subs = this._subscribers.get(key);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Store subscriber error for key "${key}":`, error);
                }
            });
        }

        // Also notify parent key subscribers (for nested keys)
        const parts = key.split('.');
        if (parts.length > 1) {
            for (let i = parts.length - 1; i > 0; i--) {
                const parentKey = parts.slice(0, i).join('.');
                const parentSubs = this._subscribers.get(parentKey);
                if (parentSubs) {
                    const parentValue = this.get(parentKey);
                    parentSubs.forEach(callback => {
                        try {
                            callback(parentValue, undefined, parentKey);
                        } catch (error) {
                            console.error(`Store subscriber error for key "${parentKey}":`, error);
                        }
                    });
                }
            }
        }

        // Notify global subscribers
        this._globalSubscribers.forEach(callback => {
            try {
                callback(key, newValue, oldValue);
            } catch (error) {
                console.error('Store global subscriber error:', error);
            }
        });
    }

    /**
     * Get a nested value using dot notation
     * @param {Object} obj
     * @param {string} path
     * @returns {*}
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Set a nested value using dot notation
     * @param {Object} obj
     * @param {string} path
     * @param {*} value
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();

        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    /**
     * Reset state to initial values
     * @param {Object} initialState
     */
    reset(initialState = {}) {
        const oldState = { ...this._state };
        this._state = initialState;

        // Notify all subscribers
        Object.keys(oldState).forEach(key => {
            this._notify(key, this._state[key], oldState[key]);
        });
    }
}

// Create and export singleton store instance
export const store = new Store({
    // Auth state
    authenticated: false,
    passwordRequired: true,

    // Current view
    currentRoute: 'dashboard',
    routeParams: {},

    // Data
    books: [],
    dashboard: null,
    pipeline: null,
    paths: [],
    stats: null,
    settings: { wip_limit: 5 },

    // Pagination
    pagination: {
        page: 1,
        perPage: 50,
        total: 0,
        pages: 1
    },

    // Filters
    filters: {
        status: '',
        search: '',
        sort: 'date_added',
        order: 'desc'
    },

    // UI state
    selectedBook: null,
    selectedPath: null,
    modalOpen: false,
    modalContent: null,
    loading: {},
    errors: {},

    // Offline state
    isOnline: navigator.onLine,
    pendingMutations: []
});

// Export Store class for testing
export { Store };
