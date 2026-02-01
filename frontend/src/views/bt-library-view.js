/**
 * bt-library-view - Library view with filters and URL state persistence
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-book-card.js';

export class BtLibraryView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            books: [],
            stats: null,
            pagination: {
                page: 1,
                perPage: 50,
                total: 0,
                pages: 1
            }
        });

        this._debouncedSearch = this.debounce(this._handleSearch.bind(this), 300);
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .controls {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .search-box {
                flex: 1;
                min-width: 200px;
            }

            .search-box input {
                width: 100%;
                padding: 8px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                color: var(--text, #2C2416);
                font-size: 0.875rem;
            }

            .search-box input:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            .filter-tabs {
                display: flex;
                gap: 4px;
                background: var(--bg-secondary, #F5F0E8);
                padding: 4px;
                border-radius: 8px;
            }

            .filter-tab {
                padding: 6px 16px;
                border: none;
                background: transparent;
                border-radius: 6px;
                color: var(--text-muted, #8B7E6A);
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.2s;
            }

            .filter-tab:hover {
                color: var(--text, #2C2416);
            }

            .filter-tab.active {
                background: var(--bg-tertiary, #EDE6DB);
                color: var(--text, #2C2416);
            }

            .filter-tab .count {
                margin-left: 6px;
                color: var(--text-muted, #8B7E6A);
                font-size: 0.75rem;
            }

            select {
                padding: 8px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                color: var(--text, #2C2416);
                font-size: 0.875rem;
                cursor: pointer;
            }

            select:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            button {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
            }

            button:hover:not(:disabled) {
                background: var(--bg-tertiary, #EDE6DB);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            button.primary {
                background: var(--accent, #8B4513);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #A0522D);
            }

            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 20px;
            }

            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin-top: 30px;
                padding: 20px 0;
            }

            .page-info {
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
            }

            @media (max-width: 768px) {
                .controls {
                    flex-direction: column;
                }

                .filter-tabs {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .filter-tabs::-webkit-scrollbar {
                    display: none;
                }

                .filter-tab {
                    white-space: nowrap;
                    padding: 8px 12px;
                }

                .books-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
            }

            @media (max-width: 375px) {
                .books-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }

    template() {
        const { loading, error, books, stats, pagination } = this.state;
        const filters = store.get('filters') || {};

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load library"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        return `
            <div class="controls">
                <div class="search-box">
                    <input
                        type="text"
                        ref="searchInput"
                        placeholder="Search books by title or author..."
                        value="${this.escapeHtml(filters.search || '')}"
                    >
                </div>
                <div class="filter-tabs">
                    ${this._renderFilterTabs(stats, filters.status)}
                </div>
                <select ref="sortSelect">
                    ${this._renderSortOptions(filters)}
                </select>
                <button ref="enrichBtn" class="primary">Enhance Covers</button>
            </div>

            <div ref="booksContainer">
                ${loading ? '<bt-loading text="Loading books..."></bt-loading>' : this._renderBooks(books)}
            </div>

            ${!loading && pagination.pages > 1 ? `
                <div class="pagination">
                    <button ref="prevBtn" ${pagination.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span class="page-info">Page ${pagination.page} of ${pagination.pages}</span>
                    <button ref="nextBtn" ${pagination.page >= pagination.pages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        `;
    }

    _renderFilterTabs(stats, currentStatus) {
        const statuses = [
            { key: '', label: 'All', count: stats?.total_books || 0 },
            { key: 'finished', label: 'Finished', count: stats?.by_status?.finished || 0 },
            { key: 'reading', label: 'Reading', count: stats?.by_status?.reading || 0 },
            { key: 'queued', label: 'Queued', count: stats?.by_status?.queued || 0 },
            { key: 'owned', label: 'Owned', count: stats?.by_status?.owned || 0 },
            { key: 'interested', label: 'Interested', count: stats?.by_status?.interested || 0 }
        ];

        return statuses.map(s => `
            <button
                class="filter-tab ${currentStatus === s.key ? 'active' : ''}"
                data-status="${s.key}"
            >${s.label}<span class="count">${s.count}</span></button>
        `).join('');
    }

    _renderSortOptions(filters) {
        const options = [
            { value: 'date_added-desc', label: 'Recently Added' },
            { value: 'date_added-asc', label: 'Oldest Added' },
            { value: 'finished_reading_at-desc', label: 'Recently Read' },
            { value: 'title-asc', label: 'Title A-Z' },
            { value: 'title-desc', label: 'Title Z-A' },
            { value: 'author-asc', label: 'Author A-Z' },
            { value: 'my_rating-desc', label: 'Highest Rated' },
            { value: 'priority-desc', label: 'Priority' },
            { value: 'page_count-desc', label: 'Most Pages' },
            { value: 'year_published-desc', label: 'Newest Published' }
        ];

        const currentValue = `${filters.sort || 'date_added'}-${filters.order || 'desc'}`;

        return options.map(opt => `
            <option value="${opt.value}" ${currentValue === opt.value ? 'selected' : ''}>${opt.label}</option>
        `).join('');
    }

    _renderBooks(books) {
        if (books.length === 0) {
            return `
                <bt-empty-state
                    title="No books found"
                    description="Try adjusting your search or filters"
                ></bt-empty-state>
            `;
        }

        return `
            <div class="books-grid">
                ${books.map(book => `
                    <bt-book-card data-book-id="${book.book_id}"></bt-book-card>
                `).join('')}
            </div>
        `;
    }

    afterRender() {
        // Set book data on cards
        const { books } = this.state;
        books.forEach(book => {
            const card = this.$(`bt-book-card[data-book-id="${book.book_id}"]`);
            if (card) {
                card.book = book;
            }
        });

        // Add event listeners
        this.$$('bt-book-card').forEach(card => {
            card.addEventListener('book-click', (e) => {
                this.emit('show-book-detail', { bookId: e.detail.book.book_id });
            });
        });

        // Search input
        const searchInput = this.ref('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this._debouncedSearch(searchInput.value);
            });
        }

        // Filter tabs
        this.$$('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._handleFilterChange(tab.dataset.status);
            });
        });

        // Sort select
        const sortSelect = this.ref('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const [sort, order] = sortSelect.value.split('-');
                this._handleSortChange(sort, order);
            });
        }

        // Pagination
        const prevBtn = this.ref('prevBtn');
        const nextBtn = this.ref('nextBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this._handlePageChange(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this._handlePageChange(1));
        }

        // Enrich button
        const enrichBtn = this.ref('enrichBtn');
        if (enrichBtn) {
            enrichBtn.addEventListener('click', () => this._handleEnrich());
        }
    }

    async onConnect() {
        // Load stats first
        try {
            const stats = await api.getStats();
            this.setState({ stats });
        } catch (e) {
            console.error('Failed to load stats:', e);
        }

        // Load books based on URL params
        await this._loadBooks();

        // Subscribe to route changes for filter updates
        this._unsubRoute = events.on('route:change', (data) => {
            if (data.route === 'library') {
                this._loadBooks();
            }
        });
    }

    onDisconnect() {
        if (this._unsubRoute) this._unsubRoute();
    }

    async _loadBooks() {
        const filters = store.get('filters') || {};
        const pagination = store.get('pagination') || { page: 1, perPage: 50 };

        this.setState({ loading: true, error: null });

        try {
            const data = await api.getBooks({
                page: pagination.page,
                perPage: pagination.perPage,
                sort: filters.sort,
                order: filters.order,
                status: filters.status,
                search: filters.search
            });

            store.set('books', data.books);
            this.setState({
                loading: false,
                books: data.books,
                pagination: {
                    page: data.page,
                    perPage: data.per_page,
                    total: data.total,
                    pages: data.pages
                }
            });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load books. Make sure the backend is running.'
            });
            console.error('Library error:', error);
        }
    }

    _handleSearch(value) {
        router.updateParams({ search: value, page: 1 });
    }

    _handleFilterChange(status) {
        router.updateParams({ status, page: 1 });
    }

    _handleSortChange(sort, order) {
        router.updateParams({ sort, order, page: 1 });
    }

    _handlePageChange(delta) {
        const { pagination } = this.state;
        const newPage = pagination.page + delta;
        if (newPage >= 1 && newPage <= pagination.pages) {
            router.updateParams({ page: newPage });
        }
    }

    async _handleEnrich() {
        const enrichBtn = this.ref('enrichBtn');
        if (enrichBtn) {
            enrichBtn.disabled = true;
            enrichBtn.textContent = 'Enhancing...';
        }

        try {
            const result = await api.enrichBooks();
            const message = `Enhanced ${result.enriched} covers. ${result.failed} not found. ${result.remaining} remaining.`;
            this.emit('toast', { message, type: 'success' });
            await this._loadBooks();
        } catch (error) {
            this.emit('toast', { message: 'Error enhancing books', type: 'error' });
            console.error('Enrich error:', error);
        } finally {
            if (enrichBtn) {
                enrichBtn.disabled = false;
                enrichBtn.textContent = 'Enhance Covers';
            }
        }
    }

    async refresh() {
        await this._loadBooks();
    }
}

defineComponent('bt-library-view', BtLibraryView);
