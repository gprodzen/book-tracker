/**
 * API Client - HTTP client with caching and offline support
 */

import { store } from '../core/store.js';
import { events, EVENT_NAMES } from '../core/events.js';
import { cacheManager } from './cache-manager.js';

// API base URL - use relative URL for production, absolute for development
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : '/api';

// Cache TTL configuration (in milliseconds)
const CACHE_TTL = {
    dashboard: 60 * 1000,      // 60 seconds
    pipeline: 60 * 1000,       // 60 seconds
    books: 30 * 1000,          // 30 seconds
    book: 5 * 60 * 1000,       // 5 minutes
    paths: 60 * 1000,          // 60 seconds
    stats: 60 * 1000,          // 60 seconds
    settings: 5 * 60 * 1000    // 5 minutes
};

class ApiClient {
    constructor() {
        this._pendingRequests = new Map();
    }

    /**
     * Make a GET request with caching
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<*>}
     */
    async get(endpoint, options = {}) {
        const cacheKey = options.cacheKey || endpoint;
        const cacheTtl = options.cacheTtl || CACHE_TTL.books;
        const skipCache = options.skipCache || false;

        // Check cache first (if online and not skipping)
        if (!skipCache && store.get('isOnline')) {
            const cached = await cacheManager.get(cacheKey);
            if (cached && !this._isStale(cached.timestamp, cacheTtl)) {
                return cached.data;
            }
        }

        // Dedupe concurrent requests
        if (this._pendingRequests.has(cacheKey)) {
            return this._pendingRequests.get(cacheKey);
        }

        const request = this._fetch(endpoint, { method: 'GET' })
            .then(async data => {
                // Cache the response
                await cacheManager.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                return data;
            })
            .finally(() => {
                this._pendingRequests.delete(cacheKey);
            });

        this._pendingRequests.set(cacheKey, request);
        return request;
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<*>}
     */
    async post(endpoint, data) {
        return this._fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    /**
     * Make a PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<*>}
     */
    async patch(endpoint, data) {
        return this._fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<*>}
     */
    async delete(endpoint) {
        const response = await this._fetchRaw(endpoint, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    }

    /**
     * Internal fetch wrapper with auth handling
     * @param {string} endpoint
     * @param {Object} options
     * @returns {Promise<*>}
     */
    async _fetch(endpoint, options = {}) {
        const response = await this._fetchRaw(endpoint, options);

        if (response.status === 401) {
            store.set('authenticated', false);
            events.emit(EVENT_NAMES.AUTH_ERROR, { status: 401 });
            throw new Error('Authentication required');
        }

        if (!response.ok) {
            const error = new Error(`API error: ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return response.json();
    }

    /**
     * Raw fetch with credentials
     * @param {string} endpoint
     * @param {Object} options
     * @returns {Promise<Response>}
     */
    async _fetchRaw(endpoint, options = {}) {
        return fetch(`${API_BASE}${endpoint}`, {
            ...options,
            credentials: 'include'
        });
    }

    /**
     * Check if cached data is stale
     * @param {number} timestamp
     * @param {number} ttl
     * @returns {boolean}
     */
    _isStale(timestamp, ttl) {
        return Date.now() - timestamp > ttl;
    }

    // ==========================================
    // Auth API
    // ==========================================

    async checkAuth() {
        const response = await this._fetchRaw('/auth/check');
        return response.json();
    }

    async login(password) {
        const response = await this._fetchRaw('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return response.json();
    }

    async logout() {
        return this.post('/auth/logout', {});
    }

    // ==========================================
    // Dashboard API
    // ==========================================

    async getDashboard() {
        const data = await this.get('/dashboard', {
            cacheKey: 'dashboard',
            cacheTtl: CACHE_TTL.dashboard
        });
        events.emit(EVENT_NAMES.DASHBOARD_LOADED, data);
        return data;
    }

    // ==========================================
    // Pipeline API
    // ==========================================

    async getPipeline() {
        const data = await this.get('/pipeline', {
            cacheKey: 'pipeline',
            cacheTtl: CACHE_TTL.pipeline
        });
        events.emit(EVENT_NAMES.PIPELINE_LOADED, data);
        return data;
    }

    // ==========================================
    // Books API
    // ==========================================

    async getBooks(params = {}) {
        const query = new URLSearchParams({
            page: params.page || 1,
            per_page: params.perPage || 50,
            sort: params.sort || 'date_added',
            order: params.order || 'desc'
        });

        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);

        const endpoint = `/books?${query}`;
        const data = await this.get(endpoint, {
            cacheKey: `books:${query.toString()}`,
            cacheTtl: CACHE_TTL.books
        });

        events.emit(EVENT_NAMES.BOOKS_LOADED, data);
        return data;
    }

    async getBook(bookId) {
        return this.get(`/books/${bookId}`, {
            cacheKey: `book:${bookId}`,
            cacheTtl: CACHE_TTL.book
        });
    }

    async createBook(data) {
        const result = await this.post('/books', data);
        await this._invalidateBookCaches();
        events.emit(EVENT_NAMES.BOOK_CREATED, result);
        return result;
    }

    async updateBook(bookId, data) {
        const result = await this.patch(`/books/${bookId}`, data);
        await this._invalidateBookCaches();
        await cacheManager.delete(`book:${bookId}`);
        events.emit(EVENT_NAMES.BOOK_UPDATED, result);
        return result;
    }

    async searchOpenLibrary(query) {
        return this.get(`/search/openlibrary?q=${encodeURIComponent(query)}&limit=10`, {
            skipCache: true
        });
    }

    async enrichBooks() {
        const result = await this.post('/books/enrich-all', {});
        await this._invalidateBookCaches();
        return result;
    }

    async getMissingCovers() {
        return this.get('/books/missing-covers', { skipCache: true });
    }

    async getCoverOptions(bookId) {
        return this.get(`/books/${bookId}/cover-options`, { skipCache: true });
    }

    async updateBookCover(bookId, coverUrl) {
        const result = await this.patch(`/books/${bookId}/cover`, { cover_url: coverUrl });
        await this._invalidateBookCaches();
        await cacheManager.delete(`book:${bookId}`);
        events.emit(EVENT_NAMES.BOOK_UPDATED, result);
        return result;
    }

    // ==========================================
    // Learning Paths API
    // ==========================================

    async getPaths() {
        const data = await this.get('/paths', {
            cacheKey: 'paths',
            cacheTtl: CACHE_TTL.paths
        });
        events.emit(EVENT_NAMES.PATHS_LOADED, data);
        return data;
    }

    async getPath(pathId) {
        return this.get(`/paths/${pathId}`, {
            cacheKey: `path:${pathId}`,
            cacheTtl: CACHE_TTL.paths
        });
    }

    async createPath(data) {
        const result = await this.post('/paths', data);
        await cacheManager.delete('paths');
        events.emit(EVENT_NAMES.PATH_CREATED, result);
        return result;
    }

    async updatePath(pathId, data) {
        const result = await this.patch(`/paths/${pathId}`, data);
        await cacheManager.delete('paths');
        await cacheManager.delete(`path:${pathId}`);
        events.emit(EVENT_NAMES.PATH_UPDATED, result);
        return result;
    }

    async deletePath(pathId) {
        await this.delete(`/paths/${pathId}`);
        await cacheManager.delete('paths');
        await cacheManager.delete(`path:${pathId}`);
        events.emit(EVENT_NAMES.PATH_DELETED, { id: pathId });
    }

    async addBookToPath(pathId, userBookId) {
        const result = await this.post(`/paths/${pathId}/books`, { user_book_id: userBookId });
        await cacheManager.delete('paths');
        await cacheManager.delete(`path:${pathId}`);
        return result;
    }

    async removeBookFromPath(pathId, userBookId) {
        await this.delete(`/paths/${pathId}/books/${userBookId}`);
        await cacheManager.delete('paths');
        await cacheManager.delete(`path:${pathId}`);
    }

    async reorderPathBooks(pathId, books) {
        const result = await this.patch(`/paths/${pathId}/books/reorder`, { books });
        await cacheManager.delete(`path:${pathId}`);
        return result;
    }

    // ==========================================
    // Stats API
    // ==========================================

    async getStats() {
        return this.get('/stats', {
            cacheKey: 'stats',
            cacheTtl: CACHE_TTL.stats
        });
    }

    // ==========================================
    // Settings API
    // ==========================================

    async getSettings() {
        return this.get('/settings', {
            cacheKey: 'settings',
            cacheTtl: CACHE_TTL.settings
        });
    }

    async updateSettings(data) {
        const result = await this.patch('/settings', data);
        await cacheManager.delete('settings');
        return result;
    }

    // ==========================================
    // Cache Helpers
    // ==========================================

    async _invalidateBookCaches() {
        // Clear all book-related caches
        await cacheManager.deleteByPrefix('books:');
        await cacheManager.delete('dashboard');
        await cacheManager.delete('pipeline');
        await cacheManager.delete('stats');
    }

    /**
     * Invalidate all caches (useful after login/logout)
     */
    async invalidateAll() {
        await cacheManager.clear();
    }
}

// Export singleton
export const api = new ApiClient();
