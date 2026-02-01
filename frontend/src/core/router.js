/**
 * Router - Hash-based router with URL state persistence
 * Supports query parameters for filter state
 */

import { store } from './store.js';
import { events } from './events.js';

class Router {
    constructor() {
        this._routes = new Map();
        this._currentRoute = null;
        this._beforeHooks = [];
        this._afterHooks = [];

        // Listen for hash changes
        window.addEventListener('hashchange', () => this._handleRouteChange());
        window.addEventListener('popstate', () => this._handleRouteChange());
    }

    /**
     * Register a route
     * @param {string} name - Route name
     * @param {Object} config - Route configuration
     */
    register(name, config = {}) {
        this._routes.set(name, {
            name,
            title: config.title || name,
            component: config.component || `bt-${name}-view`,
            requiresAuth: config.requiresAuth !== false,
            ...config
        });
    }

    /**
     * Add before navigation hook
     * @param {Function} hook - Hook function, return false to cancel
     */
    beforeEach(hook) {
        this._beforeHooks.push(hook);
    }

    /**
     * Add after navigation hook
     * @param {Function} hook - Hook function
     */
    afterEach(hook) {
        this._afterHooks.push(hook);
    }

    /**
     * Navigate to a route
     * @param {string} route - Route name
     * @param {Object} params - Query parameters
     * @param {Object} options - Navigation options
     */
    navigate(route, params = {}, options = {}) {
        const hash = this._buildHash(route, params);

        if (options.replace) {
            window.location.replace(hash);
        } else {
            window.location.hash = hash.substring(1); // Remove leading #
        }
    }

    /**
     * Update query params without full navigation
     * @param {Object} params - Parameters to update
     */
    updateParams(params) {
        const current = this.getCurrentRoute();
        const newParams = { ...current.params, ...params };

        // Remove null/undefined values
        Object.keys(newParams).forEach(key => {
            if (newParams[key] === null || newParams[key] === undefined || newParams[key] === '') {
                delete newParams[key];
            }
        });

        this.navigate(current.name, newParams, { replace: true });
    }

    /**
     * Get current route info
     * @returns {Object}
     */
    getCurrentRoute() {
        const { route, params } = this._parseHash();
        const config = this._routes.get(route) || this._routes.get('dashboard');

        return {
            name: route,
            params,
            config
        };
    }

    /**
     * Get a specific param value
     * @param {string} key - Parameter key
     * @param {*} defaultValue - Default value if not found
     * @returns {*}
     */
    getParam(key, defaultValue = null) {
        const { params } = this.getCurrentRoute();
        return params[key] !== undefined ? params[key] : defaultValue;
    }

    /**
     * Initialize router and handle initial route
     */
    init() {
        this._handleRouteChange();
    }

    /**
     * Build hash string from route and params
     * @param {string} route
     * @param {Object} params
     * @returns {string}
     */
    _buildHash(route, params = {}) {
        let hash = `#${route}`;

        const queryParts = Object.entries(params)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

        if (queryParts.length > 0) {
            hash += '?' + queryParts.join('&');
        }

        return hash;
    }

    /**
     * Parse current hash into route and params
     * @returns {Object}
     */
    _parseHash() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const [routePart, queryPart] = hash.split('?');

        const route = routePart || 'dashboard';
        const params = {};

        if (queryPart) {
            const searchParams = new URLSearchParams(queryPart);
            for (const [key, value] of searchParams) {
                params[key] = value;
            }
        }

        return { route, params };
    }

    /**
     * Handle route change
     */
    async _handleRouteChange() {
        const { route, params } = this._parseHash();
        const routeConfig = this._routes.get(route) || this._routes.get('dashboard');

        // Check authentication
        if (routeConfig && routeConfig.requiresAuth) {
            const authenticated = store.get('authenticated');
            const passwordRequired = store.get('passwordRequired');

            if (!authenticated && passwordRequired) {
                // Show login instead
                store.set('currentRoute', 'login');
                store.set('routeParams', {});
                events.emit('route:change', { route: 'login', params: {}, config: { component: 'bt-login-view' } });
                return;
            }
        }

        // Run before hooks
        for (const hook of this._beforeHooks) {
            const result = await hook({ route, params, config: routeConfig });
            if (result === false) {
                return; // Cancel navigation
            }
        }

        // Update store
        store.set('currentRoute', route);
        store.set('routeParams', params);

        // Sync filter params to store for library view
        if (route === 'library') {
            store.update({
                'filters.status': params.status || '',
                'filters.search': params.search || '',
                'filters.sort': params.sort || 'date_added',
                'filters.order': params.order || 'desc',
                'pagination.page': parseInt(params.page) || 1
            });
        }

        // Emit route change event
        events.emit('route:change', { route, params, config: routeConfig });

        // Update document title
        if (routeConfig && routeConfig.title) {
            document.title = `${routeConfig.title} - Book Tracker`;
        }

        // Run after hooks
        for (const hook of this._afterHooks) {
            await hook({ route, params, config: routeConfig });
        }

        this._currentRoute = route;
    }
}

// Create and export singleton
export const router = new Router();

// Register default routes
router.register('dashboard', { title: 'Dashboard' });
router.register('pipeline', { title: 'Pipeline' });
router.register('library', { title: 'Library' });
router.register('paths', { title: 'Learning Paths' });
router.register('settings', { title: 'Settings' });
router.register('login', { title: 'Sign In', requiresAuth: false });
