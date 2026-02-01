/**
 * Book Tracker - Main Application Entry Point
 * Bootstrap, router initialization, and component orchestration
 */

import { store } from './core/store.js';
import { router } from './core/router.js';
import { events, EVENT_NAMES } from './core/events.js';
import { api } from './services/api-client.js';
import { offlineQueue } from './services/offline-queue.js';

// Import layout components
import './components/layout/bt-app-shell.js';
import './components/layout/bt-nav.js';
import './components/layout/bt-fab.js';

// Import shared components
import './components/shared/bt-modal.js';
import './components/shared/bt-toast.js';
import './components/shared/bt-loading.js';
import './components/shared/bt-empty-state.js';

// Import view components
import './views/bt-login-view.js';
import './views/bt-dashboard-view.js';
import './views/bt-library-view.js';
import './views/bt-pipeline-view.js';
import './views/bt-paths-view.js';

// Import book components
import './components/books/bt-book-detail.js';
import './components/books/bt-book-form.js';
import './components/books/bt-checkin-modal.js';
import './components/books/bt-reading-history.js';

/**
 * Application class
 */
class BookTrackerApp {
    constructor() {
        this._viewContainer = null;
        this._modal = null;
        this._toast = null;
        this._currentView = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('[App] Initializing Book Tracker...');

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Cache DOM references
        this._viewContainer = document.getElementById('view-container');
        this._modal = document.querySelector('bt-modal');
        this._toast = document.querySelector('bt-toast');

        // Set up event listeners
        this._setupEventListeners();

        // Check authentication
        await this._checkAuth();

        // Register service worker
        this._registerServiceWorker();

        // Initialize router
        router.init();

        console.log('[App] Initialization complete');
    }

    /**
     * Set up application event listeners
     */
    _setupEventListeners() {
        // Route changes
        events.on('route:change', ({ route, params, config }) => {
            this._handleRouteChange(route, params, config);
        });

        // Auth events
        events.on(EVENT_NAMES.AUTH_LOGIN, () => {
            this._updateNavVisibility(true);
            this._updateFabVisibility(true);
        });

        events.on(EVENT_NAMES.AUTH_LOGOUT, () => {
            this._updateNavVisibility(false);
            this._updateFabVisibility(false);
            api.invalidateAll();
        });

        events.on(EVENT_NAMES.AUTH_ERROR, () => {
            router.navigate('login');
        });

        // Offline sync
        events.on(EVENT_NAMES.SYNC_COMPLETE, ({ synced }) => {
            if (synced > 0) {
                this._showToast(`Synced ${synced} changes`, 'success');
                this._refreshCurrentView();
            }
        });

        events.on(EVENT_NAMES.SYNC_ERROR, ({ synced, failed }) => {
            this._showToast(`Sync: ${synced} succeeded, ${failed} failed`, 'warning');
        });

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_MUTATIONS') {
                    offlineQueue.sync();
                }
            });
        }

        // Nav logout handler
        const nav = document.querySelector('bt-nav');
        if (nav) {
            nav.addEventListener('logout', () => this._handleLogout());
        }

        // FAB click handler
        const fab = document.querySelector('bt-fab');
        if (fab) {
            fab.addEventListener('click', () => this._showAddBookModal());
        }

        // Global view event handlers (bubbled up from views)
        this._viewContainer?.addEventListener('show-book-detail', (e) => {
            this._showBookDetail(e.detail.bookId);
        });

        this._viewContainer?.addEventListener('create-path', () => {
            this._showCreatePathModal();
        });

        this._viewContainer?.addEventListener('edit-path', (e) => {
            this._showEditPathModal(e.detail.pathId);
        });

        this._viewContainer?.addEventListener('add-book-to-path', (e) => {
            this._showAddBookToPathModal(e.detail.pathId);
        });

        this._viewContainer?.addEventListener('toast', (e) => {
            this._showToast(e.detail.message, e.detail.type);
        });
    }

    /**
     * Check authentication status
     */
    async _checkAuth() {
        try {
            const authState = await api.checkAuth();
            store.set('authenticated', authState.authenticated);
            store.set('passwordRequired', authState.password_required);

            if (!authState.password_required) {
                store.set('authenticated', true);
            }

            // Load settings if authenticated
            if (store.get('authenticated')) {
                try {
                    const settings = await api.getSettings();
                    store.set('settings', settings);
                } catch (e) {
                    console.error('[App] Failed to load settings:', e);
                }
            }

            // Update UI visibility
            this._updateNavVisibility(store.get('authenticated'));
            this._updateFabVisibility(store.get('authenticated'));
        } catch (error) {
            console.error('[App] Auth check failed:', error);
            store.set('authenticated', false);
            store.set('passwordRequired', true);
        }
    }

    /**
     * Handle route changes
     */
    _handleRouteChange(route, params, config) {
        const authenticated = store.get('authenticated');
        const passwordRequired = store.get('passwordRequired');

        // Redirect to login if not authenticated
        if (!authenticated && passwordRequired && route !== 'login') {
            this._renderView('login', {});
            return;
        }

        // Render the appropriate view
        this._renderView(route, params);
    }

    /**
     * Render a view
     */
    _renderView(route, params) {
        if (!this._viewContainer) return;

        const viewMap = {
            login: 'bt-login-view',
            dashboard: 'bt-dashboard-view',
            library: 'bt-library-view',
            pipeline: 'bt-pipeline-view',
            paths: 'bt-paths-view'
        };

        const viewTag = viewMap[route] || viewMap.dashboard;

        // Remove old view
        if (this._currentView) {
            this._currentView.remove();
        }

        // Create new view
        this._currentView = document.createElement(viewTag);

        // Pass params as attributes
        Object.entries(params).forEach(([key, value]) => {
            this._currentView.setAttribute(key, value);
        });

        this._viewContainer.innerHTML = '';
        this._viewContainer.appendChild(this._currentView);
    }

    /**
     * Refresh current view
     */
    _refreshCurrentView() {
        if (this._currentView && typeof this._currentView.refresh === 'function') {
            this._currentView.refresh();
        }
    }

    /**
     * Show/hide navigation
     */
    _updateNavVisibility(visible) {
        const nav = document.querySelector('bt-nav');
        if (nav) {
            nav.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Show/hide FAB
     */
    _updateFabVisibility(visible) {
        const fab = document.querySelector('bt-fab');
        if (fab) {
            fab.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Handle logout
     */
    async _handleLogout() {
        try {
            await api.logout();
            store.set('authenticated', false);
            events.emit(EVENT_NAMES.AUTH_LOGOUT);
            router.navigate('login');
        } catch (error) {
            console.error('[App] Logout failed:', error);
        }
    }

    /**
     * Show toast notification
     */
    _showToast(message, type = 'info') {
        if (this._toast) {
            this._toast.show({ message, type });
        } else {
            events.emit(EVENT_NAMES.TOAST_SHOW, { message, type });
        }
    }

    /**
     * Show add book modal
     */
    _showAddBookModal(sourceBookId = null) {
        if (!this._modal) return;

        const form = document.createElement('bt-book-form');
        if (sourceBookId) {
            form.setAttribute('source-book-id', sourceBookId);
        }

        form.addEventListener('book-created', () => {
            this._modal.close();
            this._showToast('Book added to library', 'success');
            this._refreshCurrentView();
        });

        form.addEventListener('cancel', () => {
            this._modal.close();
        });

        this._modal.setContent('Add Book', '');
        this._modal.appendChild(form);
        this._modal.open();
    }

    /**
     * Show book detail modal
     */
    _showBookDetail(bookId) {
        if (!this._modal) return;

        const detail = document.createElement('bt-book-detail');
        detail.setAttribute('book-id', bookId);

        detail.addEventListener('book-updated', () => {
            this._refreshCurrentView();
        });

        detail.addEventListener('add-sparked-book', (e) => {
            this._modal.close();
            setTimeout(() => {
                this._showAddBookModal(e.detail.sourceBookId);
            }, 100);
        });

        detail.addEventListener('show-book', (e) => {
            detail.setAttribute('book-id', e.detail.bookId);
        });

        detail.addEventListener('toast', (e) => {
            this._showToast(e.detail.message, e.detail.type);
        });

        this._modal.setContent('Book Details', '');
        this._modal.appendChild(detail);
        this._modal.open();
    }

    /**
     * Show create path modal
     */
    _showCreatePathModal() {
        if (!this._modal) return;

        const content = `
            <form id="create-path-form">
                <div class="form-group">
                    <label for="path-name">Name</label>
                    <input type="text" id="path-name" required placeholder="e.g., Leadership & Management">
                </div>
                <div class="form-group">
                    <label for="path-objective">Objective</label>
                    <textarea id="path-objective" placeholder="What do you want to achieve with this learning path?"></textarea>
                </div>
                <div class="form-group">
                    <label for="path-description">Description (optional)</label>
                    <textarea id="path-description" placeholder="Additional details about this learning path"></textarea>
                </div>
                <div class="form-group">
                    <label for="path-color">Color</label>
                    <input type="color" id="path-color" value="#8B4513">
                </div>
                <div class="form-actions">
                    <button type="button" onclick="document.querySelector('bt-modal').close()">Cancel</button>
                    <button type="submit" class="primary">Create Path</button>
                </div>
            </form>
        `;

        this._modal.setContent('Create Learning Path', content);
        this._modal.open();

        const form = this._modal.querySelector('#create-path-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: form.querySelector('#path-name').value,
                objective: form.querySelector('#path-objective').value,
                description: form.querySelector('#path-description').value,
                color: form.querySelector('#path-color').value
            };

            try {
                await api.createPath(data);
                this._modal.close();
                this._showToast('Path created', 'success');
                this._refreshCurrentView();
            } catch (error) {
                console.error('Error creating path:', error);
                this._showToast('Failed to create path', 'error');
            }
        });
    }

    /**
     * Show edit path modal
     */
    async _showEditPathModal(pathId) {
        if (!this._modal) return;

        try {
            const path = await api.getPath(pathId);

            const content = `
                <form id="edit-path-form">
                    <div class="form-group">
                        <label for="path-name">Name</label>
                        <input type="text" id="path-name" required value="${path.name}">
                    </div>
                    <div class="form-group">
                        <label for="path-objective">Objective</label>
                        <textarea id="path-objective">${path.objective || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="path-description">Description</label>
                        <textarea id="path-description">${path.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="path-color">Color</label>
                        <input type="color" id="path-color" value="${path.color || '#8B4513'}">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="document.querySelector('bt-modal').close()">Cancel</button>
                        <button type="submit" class="primary">Save Changes</button>
                    </div>
                </form>
            `;

            this._modal.setContent('Edit Learning Path', content);
            this._modal.open();

            const form = this._modal.querySelector('#edit-path-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    name: form.querySelector('#path-name').value,
                    objective: form.querySelector('#path-objective').value,
                    description: form.querySelector('#path-description').value,
                    color: form.querySelector('#path-color').value
                };

                try {
                    await api.updatePath(pathId, data);
                    this._modal.close();
                    this._showToast('Path updated', 'success');
                    this._refreshCurrentView();
                } catch (error) {
                    console.error('Error updating path:', error);
                    this._showToast('Failed to update path', 'error');
                }
            });
        } catch (error) {
            console.error('Error loading path:', error);
            this._showToast('Failed to load path', 'error');
        }
    }

    /**
     * Show add book to path modal
     */
    async _showAddBookToPathModal(pathId) {
        if (!this._modal) return;

        try {
            const [allBooks, pathBooks] = await Promise.all([
                api.getBooks({ perPage: 500 }),
                api.getPath(pathId)
            ]);

            const pathBookIds = new Set((pathBooks.books || []).map(b => b.user_book_id));
            const availableBooks = allBooks.books.filter(b => !pathBookIds.has(b.user_book_id));

            const content = `
                <div class="form-group">
                    <label>Search for a book to add</label>
                    <input type="text" id="book-search" placeholder="Type to search..." oninput="filterPathBookList()">
                </div>
                <div id="book-list" style="max-height: 300px; overflow-y: auto;">
                    ${availableBooks.map(book => `
                        <div class="book-list-item" data-title="${book.title.toLowerCase()}" data-author="${book.author.toLowerCase()}" data-user-book-id="${book.user_book_id}" style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; gap: 12px; align-items: center;">
                            <div style="width: 40px; height: 60px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                                ${book.cover_image_url ? `<img src="${book.cover_image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 0.875rem;">${book.title}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${book.author}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            this._modal.setContent('Add Book to Path', content);
            this._modal.open();

            // Add click handlers to book items
            this._modal.querySelectorAll('.book-list-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const userBookId = parseInt(item.dataset.userBookId);
                    try {
                        await api.addBookToPath(pathId, userBookId);
                        this._modal.close();
                        this._showToast('Book added to path', 'success');
                        this._refreshCurrentView();
                    } catch (error) {
                        console.error('Error adding book:', error);
                        this._showToast('Failed to add book', 'error');
                    }
                });
            });

            // Add filter function to window for inline event handler
            window.filterPathBookList = () => {
                const search = this._modal.querySelector('#book-search').value.toLowerCase();
                this._modal.querySelectorAll('.book-list-item').forEach(item => {
                    const matches = item.dataset.title.includes(search) || item.dataset.author.includes(search);
                    item.style.display = matches ? 'flex' : 'none';
                });
            };
        } catch (error) {
            console.error('Error loading books:', error);
            this._showToast('Failed to load books', 'error');
        }
    }

    /**
     * Register service worker
     */
    async _registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[App] Service workers not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[App] Service worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this._showToast('New version available. Refresh to update.', 'info', 0);
                    }
                });
            });
        } catch (error) {
            console.error('[App] Service worker registration failed:', error);
        }
    }
}

// Create and initialize the app
const app = new BookTrackerApp();
app.init();

// Export for debugging
window.bookTrackerApp = app;
