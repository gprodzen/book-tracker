/**
 * bt-paths-view - Learning paths view with nested interactions
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-progress-bar.js';

export class BtPathsView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            paths: [],
            expandedPaths: new Set()
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            h1 {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text, #c9d1d9);
            }

            button {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                color: var(--text, #c9d1d9);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
            }

            button:hover:not(:disabled) {
                background: var(--bg-tertiary, #21262d);
            }

            button.primary {
                background: var(--accent, #58a6ff);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #79b8ff);
            }

            button.danger {
                color: var(--red, #f85149);
            }

            button.danger:hover {
                background: rgba(248, 81, 73, 0.1);
            }

            .paths-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .path-item {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 8px;
                padding: 20px;
            }

            .path-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }

            .path-title {
                font-size: 1.1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .path-icon {
                width: 12px;
                height: 12px;
                border-radius: 2px;
            }

            .path-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .path-progress {
                font-size: 0.875rem;
                color: var(--text-muted, #8b949e);
            }

            .path-objective {
                font-size: 0.9rem;
                color: var(--accent, #58a6ff);
                margin-bottom: 12px;
                padding: 8px 12px;
                background: rgba(88, 166, 255, 0.1);
                border-radius: 6px;
                border-left: 3px solid var(--accent, #58a6ff);
            }

            .path-description {
                color: var(--text-muted, #8b949e);
                font-size: 0.875rem;
                margin-bottom: 16px;
            }

            .path-books {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 16px;
            }

            .path-book {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.875rem;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .path-book:hover {
                background: var(--bg-tertiary, #21262d);
            }

            .path-book.completed {
                color: var(--green, #3fb950);
            }

            .path-book.reading {
                color: var(--accent, #58a6ff);
            }

            .path-book.pending {
                color: var(--text-muted, #8b949e);
            }

            .book-progress {
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
            }

            .path-footer {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid var(--border, #30363d);
            }

            @media (max-width: 768px) {
                .path-header {
                    flex-direction: column;
                    gap: 12px;
                }

                .path-books {
                    flex-direction: column;
                    gap: 8px;
                }
            }
        `;
    }

    template() {
        const { loading, error, paths } = this.state;

        if (loading) {
            return '<bt-loading text="Loading learning paths..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load learning paths"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        return `
            <div class="header">
                <h1>Learning Paths</h1>
                <button class="primary" ref="createPathBtn">+ New Path</button>
            </div>

            ${paths.length > 0 ? `
                <div class="paths-list">
                    ${paths.map(path => this._renderPathItem(path)).join('')}
                </div>
            ` : `
                <bt-empty-state
                    title="No learning paths yet"
                    description="Create learning paths to organize your reading around topics or goals."
                >
                    <button class="primary" ref="createFirstPathBtn">Create Your First Path</button>
                </bt-empty-state>
            `}
        `;
    }

    _renderPathItem(path) {
        const total = path.total_books || 0;
        const completed = path.completed_books || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const books = path.books || [];

        return `
            <div class="path-item" data-path-id="${path.id}">
                <div class="path-header">
                    <div class="path-title">
                        <span class="path-icon" style="background: ${path.color}"></span>
                        ${this.escapeHtml(path.name)}
                    </div>
                    <div class="path-actions">
                        <span class="path-progress">${completed}/${total} complete</span>
                        <button data-action="edit" data-path-id="${path.id}">Edit</button>
                        <button class="danger" data-action="delete" data-path-id="${path.id}">Delete</button>
                    </div>
                </div>

                ${path.objective ? `
                    <div class="path-objective">${this.escapeHtml(path.objective)}</div>
                ` : ''}

                <bt-progress-bar value="${completed}" max="${total}"></bt-progress-bar>

                ${path.description ? `
                    <p class="path-description">${this.escapeHtml(path.description)}</p>
                ` : ''}

                <div class="path-books">
                    ${books.map(book => {
                        let icon = '\u25CB'; // Circle
                        let className = 'pending';
                        if (book.status === 'finished') {
                            icon = '\u2713'; // Checkmark
                            className = 'completed';
                        } else if (book.status === 'reading') {
                            icon = '\u25B6'; // Play
                            className = 'reading';
                        }
                        const progressText = book.status === 'reading' ? ` <span class="book-progress">(${book.progress_percent || 0}%)</span>` : '';
                        return `
                            <span class="path-book ${className}" data-book-id="${book.book_id}">
                                ${icon} ${this.escapeHtml(book.title)}${progressText}
                            </span>
                        `;
                    }).join('')}
                </div>

                <div class="path-footer">
                    <button data-action="add-book" data-path-id="${path.id}">+ Add Book</button>
                </div>
            </div>
        `;
    }

    afterRender() {
        // Create path button
        const createPathBtn = this.ref('createPathBtn');
        if (createPathBtn) {
            createPathBtn.addEventListener('click', () => this.emit('create-path'));
        }

        const createFirstPathBtn = this.ref('createFirstPathBtn');
        if (createFirstPathBtn) {
            createFirstPathBtn.addEventListener('click', () => this.emit('create-path'));
        }

        // Path action buttons
        this.$$('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const pathId = parseInt(btn.dataset.pathId);

                switch (action) {
                    case 'edit':
                        this.emit('edit-path', { pathId });
                        break;
                    case 'delete':
                        this._handleDeletePath(pathId);
                        break;
                    case 'add-book':
                        this.emit('add-book-to-path', { pathId });
                        break;
                }
            });
        });

        // Book clicks
        this.$$('.path-book').forEach(book => {
            book.addEventListener('click', () => {
                const bookId = parseInt(book.dataset.bookId);
                this.emit('show-book-detail', { bookId });
            });
        });
    }

    async _handleDeletePath(pathId) {
        if (!confirm('Are you sure you want to delete this learning path? This will not delete the books, just the path.')) {
            return;
        }

        try {
            await api.deletePath(pathId);
            await this._loadData();
            this.emit('toast', { message: 'Path deleted', type: 'success' });
        } catch (error) {
            console.error('Error deleting path:', error);
            this.emit('toast', { message: 'Failed to delete path', type: 'error' });
        }
    }

    async onConnect() {
        await this._loadData();

        // Subscribe to updates
        this._unsubPaths = events.on(EVENT_NAMES.PATHS_LOADED, () => {
            this._loadData();
        });

        this._unsubPathCreated = events.on(EVENT_NAMES.PATH_CREATED, () => {
            this._loadData();
        });

        this._unsubPathUpdated = events.on(EVENT_NAMES.PATH_UPDATED, () => {
            this._loadData();
        });

        this._unsubPathDeleted = events.on(EVENT_NAMES.PATH_DELETED, () => {
            this._loadData();
        });
    }

    onDisconnect() {
        if (this._unsubPaths) this._unsubPaths();
        if (this._unsubPathCreated) this._unsubPathCreated();
        if (this._unsubPathUpdated) this._unsubPathUpdated();
        if (this._unsubPathDeleted) this._unsubPathDeleted();
    }

    async _loadData() {
        this.setState({ loading: true, error: null });

        try {
            const paths = await api.getPaths();

            // Load full details for each path
            const pathsWithDetails = await Promise.all(
                paths.map(async (path) => {
                    try {
                        return await api.getPath(path.id);
                    } catch (e) {
                        return { ...path, books: [] };
                    }
                })
            );

            store.set('paths', pathsWithDetails);
            this.setState({ loading: false, paths: pathsWithDetails });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load learning paths. Make sure the backend is running.'
            });
            console.error('Paths error:', error);
        }
    }

    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-paths-view', BtPathsView);
