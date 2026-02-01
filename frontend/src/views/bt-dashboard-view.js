/**
 * bt-dashboard-view - Dashboard view component
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-book-card.js';
import '../components/shared/bt-progress-bar.js';

export class BtDashboardView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            data: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .section {
                margin-bottom: 32px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .section-title {
                font-size: 0.875rem;
                font-weight: 600;
                text-transform: uppercase;
                color: var(--text-muted, #8b949e);
                letter-spacing: 0.5px;
            }

            .wip-indicator {
                font-size: 0.75rem;
                padding: 4px 8px;
                border-radius: 4px;
                background: var(--bg-tertiary, #21262d);
            }

            .wip-indicator.warning {
                background: rgba(210, 153, 34, 0.2);
                color: var(--yellow, #d29922);
            }

            .wip-indicator.over {
                background: rgba(248, 81, 73, 0.2);
                color: var(--red, #f85149);
            }

            .reading-row {
                display: flex;
                gap: 20px;
                overflow-x: auto;
                padding-bottom: 8px;
            }

            .reading-row::-webkit-scrollbar {
                height: 6px;
            }

            .reading-row::-webkit-scrollbar-track {
                background: var(--bg);
            }

            .reading-row::-webkit-scrollbar-thumb {
                background: var(--bg-tertiary);
                border-radius: 3px;
            }

            .reading-card {
                flex: 0 0 160px;
            }

            .paths-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }

            .path-card {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 8px;
                padding: 16px;
                cursor: pointer;
                transition: border-color 0.2s;
            }

            .path-card:hover {
                border-color: var(--accent, #58a6ff);
            }

            .path-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .path-name {
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .path-icon {
                width: 8px;
                height: 8px;
                border-radius: 2px;
            }

            .path-progress-text {
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
            }

            .path-next {
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
                margin-top: 12px;
            }

            .path-next strong {
                color: var(--text, #c9d1d9);
            }

            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 20px;
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

            button:hover {
                background: var(--bg-tertiary, #21262d);
            }

            button.primary {
                background: var(--accent, #58a6ff);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover {
                background: var(--accent-hover, #79b8ff);
            }

            @media (max-width: 768px) {
                .section-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                }

                .paths-grid {
                    grid-template-columns: 1fr;
                }

                .books-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .reading-row {
                    gap: 12px;
                }

                .reading-card {
                    flex: 0 0 140px;
                }
            }
        `;
    }

    template() {
        const { loading, error, data } = this.state;

        if (loading) {
            return '<bt-loading text="Loading dashboard..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load dashboard"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        if (!data) {
            return '<bt-loading text="Loading dashboard..."></bt-loading>';
        }

        const { currently_reading, queued, learning_paths, wip_limit, reading_count } = data;

        let wipClass = '';
        if (reading_count >= wip_limit) wipClass = 'over';
        else if (reading_count >= wip_limit - 1) wipClass = 'warning';

        return `
            <!-- Currently Reading Section -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Currently Reading</h2>
                    <span class="wip-indicator ${wipClass}">${reading_count} of ${wip_limit} limit</span>
                </div>
                ${currently_reading.length > 0 ? `
                    <div class="reading-row">
                        ${currently_reading.map(book => `
                            <div class="reading-card">
                                <bt-book-card variant="reading" data-book-id="${book.book_id}"></bt-book-card>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <bt-empty-state
                        title="No books in progress"
                        description="Move a book to 'Reading' to get started"
                    ></bt-empty-state>
                `}
            </section>

            <!-- Learning Paths Section -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Learning Paths</h2>
                    <button ref="viewPathsBtn">View All</button>
                </div>
                ${learning_paths.length > 0 ? `
                    <div class="paths-grid">
                        ${learning_paths.map(path => this._renderPathCard(path)).join('')}
                    </div>
                ` : `
                    <bt-empty-state
                        title="No learning paths yet"
                    >
                        <button class="primary" ref="createPathBtn">Create Your First Path</button>
                    </bt-empty-state>
                `}
            </section>

            <!-- Queued Up Section -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">Queued Up</h2>
                    <button ref="viewPipelineBtn">View Pipeline</button>
                </div>
                ${queued.length > 0 ? `
                    <div class="books-grid">
                        ${queued.slice(0, 6).map(book => `
                            <bt-book-card data-book-id="${book.book_id}"></bt-book-card>
                        `).join('')}
                    </div>
                ` : `
                    <bt-empty-state
                        title="No books in queue"
                        description="Add books to your queue from the Library or Pipeline view"
                    ></bt-empty-state>
                `}
            </section>
        `;
    }

    _renderPathCard(path) {
        const total = path.total_books || 0;
        const completed = path.completed_books || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return `
            <div class="path-card" data-path-id="${path.id}">
                <div class="path-card-header">
                    <div class="path-name">
                        <span class="path-icon" style="background: ${path.color}"></span>
                        ${this.escapeHtml(path.name)}
                    </div>
                    <span class="path-progress-text">${completed}/${total}</span>
                </div>
                <bt-progress-bar value="${completed}" max="${total}"></bt-progress-bar>
                ${path.next_book ? `
                    <div class="path-next">Next: <strong>${this.escapeHtml(path.next_book)}</strong></div>
                ` : ''}
            </div>
        `;
    }

    afterRender() {
        // Set book data on cards
        const { data } = this.state;
        if (data) {
            // Set reading cards
            data.currently_reading.forEach(book => {
                const card = this.$(`bt-book-card[data-book-id="${book.book_id}"]`);
                if (card) {
                    card.book = book;
                }
            });

            // Set queued cards
            data.queued.slice(0, 6).forEach(book => {
                const card = this.$(`bt-book-card[data-book-id="${book.book_id}"]`);
                if (card) {
                    card.book = book;
                }
            });
        }

        // Add click handlers
        this.$$('bt-book-card').forEach(card => {
            card.addEventListener('book-click', (e) => {
                this.emit('show-book-detail', { bookId: e.detail.book.book_id });
            });
        });

        this.$$('.path-card').forEach(card => {
            card.addEventListener('click', () => {
                router.navigate('paths');
            });
        });

        // Button handlers
        const viewPathsBtn = this.ref('viewPathsBtn');
        if (viewPathsBtn) {
            viewPathsBtn.addEventListener('click', () => router.navigate('paths'));
        }

        const viewPipelineBtn = this.ref('viewPipelineBtn');
        if (viewPipelineBtn) {
            viewPipelineBtn.addEventListener('click', () => router.navigate('pipeline'));
        }

        const createPathBtn = this.ref('createPathBtn');
        if (createPathBtn) {
            createPathBtn.addEventListener('click', () => {
                this.emit('create-path');
            });
        }
    }

    async onConnect() {
        await this._loadData();

        // Subscribe to book updates to refresh dashboard
        this._unsubBookUpdated = events.on(EVENT_NAMES.BOOK_UPDATED, () => {
            this._loadData();
        });

        this._unsubBookCreated = events.on(EVENT_NAMES.BOOK_CREATED, () => {
            this._loadData();
        });
    }

    onDisconnect() {
        if (this._unsubBookUpdated) this._unsubBookUpdated();
        if (this._unsubBookCreated) this._unsubBookCreated();
    }

    async _loadData() {
        this.setState({ loading: true, error: null });

        try {
            const data = await api.getDashboard();
            store.set('dashboard', data);
            this.setState({ loading: false, data });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load dashboard. Make sure the backend is running.'
            });
            console.error('Dashboard error:', error);
        }
    }

    /**
     * Refresh the dashboard data
     */
    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-dashboard-view', BtDashboardView);
