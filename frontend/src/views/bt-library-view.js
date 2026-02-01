/**
 * bt-library-view - Library view with table interface and URL state persistence
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-book-cover.js';
import '../components/shared/bt-status-badge.js';
import '../components/shared/bt-progress-bar.js';

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

            /* ==========================================================================
               Controls
               ========================================================================== */
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
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: 6px;
                color: var(--color-text-primary, #2C2416);
                font-family: var(--font-display, 'Crimson Pro', Georgia, serif);
                font-size: 0.875rem;
            }

            .search-box input:focus {
                outline: none;
                border-color: var(--color-accent, #8B4513);
            }

            .filter-tabs {
                display: flex;
                gap: 4px;
                background: var(--color-bg-secondary, #F5F0E8);
                padding: 4px;
                border-radius: 8px;
            }

            .filter-tab {
                padding: 6px 16px;
                border: none;
                background: transparent;
                border-radius: 6px;
                color: var(--color-text-muted, #8B7E6A);
                cursor: pointer;
                font-family: var(--font-display, 'Crimson Pro', Georgia, serif);
                font-size: 0.875rem;
                transition: all 0.2s;
            }

            .filter-tab:hover {
                color: var(--color-text-primary, #2C2416);
            }

            .filter-tab.active {
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-primary, #2C2416);
            }

            .filter-tab .count {
                margin-left: 6px;
                color: var(--color-text-muted, #8B7E6A);
                font-size: 0.75rem;
            }

            .btn {
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                color: var(--color-text-primary, #2C2416);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-family: var(--font-display, 'Crimson Pro', Georgia, serif);
                font-size: 0.875rem;
                transition: all 0.15s ease-out;
            }

            .btn:hover:not(:disabled) {
                background: var(--color-bg-tertiary, #EDE6DB);
            }

            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .btn.primary {
                background: var(--color-accent, #8B4513);
                border-color: var(--color-accent);
                color: white;
            }

            .btn.primary:hover:not(:disabled) {
                background: var(--color-accent-hover, #A0522D);
            }

            /* ==========================================================================
               Table Container
               ========================================================================== */
            .table-container {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: 8px;
                overflow: hidden;
            }

            .table-scroll {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            /* ==========================================================================
               Table Styles
               ========================================================================== */
            .books-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
                min-width: 800px;
            }

            .books-table th {
                text-align: left;
                font-weight: 500;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-muted, #8B7E6A);
                background: var(--color-bg-secondary, #F5F0E8);
                border-bottom: 1px solid var(--color-border, #D4C9B8);
                padding: 12px 16px;
                white-space: nowrap;
            }

            .books-table th.sortable {
                cursor: pointer;
                user-select: none;
                transition: color 0.15s ease-out;
            }

            .books-table th.sortable:hover {
                color: var(--color-text-primary, #2C2416);
            }

            .books-table th .sort-icon {
                margin-left: 4px;
                opacity: 0.3;
                font-size: 0.625rem;
            }

            .books-table th.sorted {
                color: var(--color-accent, #8B4513);
            }

            .books-table th.sorted .sort-icon {
                opacity: 1;
            }

            .books-table td {
                padding: 12px 16px;
                border-bottom: 1px solid var(--color-border-subtle, #E5DED2);
                vertical-align: middle;
            }

            .books-table tbody tr {
                transition: background 0.15s ease-out;
                cursor: pointer;
            }

            .books-table tbody tr:hover {
                background: var(--color-surface-hover, #FDFCFA);
            }

            .books-table tbody tr:nth-child(even) {
                background: rgba(245, 240, 232, 0.5);
            }

            .books-table tbody tr:nth-child(even):hover {
                background: var(--color-surface-hover, #FDFCFA);
            }

            .books-table tbody tr:last-child td {
                border-bottom: none;
            }

            /* Column-specific styles */
            .col-cover {
                width: 56px;
                padding-right: 8px;
            }

            .cover-thumb {
                width: 40px;
                height: 60px;
                object-fit: cover;
                border-radius: 4px;
                background: var(--color-bg-tertiary, #EDE6DB);
                display: block;
            }

            .col-title {
                font-weight: 500;
                color: var(--color-text-primary, #2C2416);
                max-width: 300px;
            }

            .col-title .title-text {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.4;
            }

            .col-author {
                color: var(--color-text-secondary, #5C5244);
                max-width: 180px;
            }

            .col-author .author-text {
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .col-progress {
                width: 100px;
            }

            .progress-text {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.75rem;
                color: var(--color-accent, #8B4513);
                margin-bottom: 4px;
            }

            .progress-bar {
                height: 4px;
                background: var(--color-bg-tertiary, #EDE6DB);
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-bar .fill {
                height: 100%;
                background: var(--color-accent, #8B4513);
                border-radius: 2px;
                transition: width 0.3s ease-out;
            }

            .col-rating {
                color: var(--color-warning, #B8860B);
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.75rem;
                letter-spacing: -1px;
                white-space: nowrap;
            }

            .col-pages,
            .col-date {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.8125rem;
                color: var(--color-text-muted, #8B7E6A);
                white-space: nowrap;
            }

            .no-rating {
                color: var(--color-text-muted, #8B7E6A);
            }

            /* ==========================================================================
               Pagination
               ========================================================================== */
            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin-top: 24px;
                padding: 16px 0;
            }

            .page-info {
                color: var(--color-text-muted, #8B7E6A);
                font-size: 0.875rem;
            }

            /* ==========================================================================
               Mobile Responsiveness
               ========================================================================== */
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

                .table-scroll {
                    margin: 0 -16px;
                    padding: 0 16px;
                }

                .books-table {
                    font-size: 0.8125rem;
                }

                .books-table th,
                .books-table td {
                    padding: 10px 12px;
                }

                /* Hide less important columns on mobile */
                .hide-mobile {
                    display: none;
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
                    <button class="btn" onclick="location.reload()">Try Again</button>
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
                <button ref="enrichBtn" class="btn primary">Enhance Covers</button>
            </div>

            <div ref="booksContainer">
                ${loading ? '<bt-loading text="Loading books..."></bt-loading>' : this._renderBooks(books, filters)}
            </div>

            ${!loading && pagination.pages > 1 ? `
                <div class="pagination">
                    <button ref="prevBtn" class="btn" ${pagination.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span class="page-info">Page ${pagination.page} of ${pagination.pages}</span>
                    <button ref="nextBtn" class="btn" ${pagination.page >= pagination.pages ? 'disabled' : ''}>Next</button>
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
            { key: 'want_to_read', label: 'Want to Read', count: stats?.by_status?.want_to_read || 0 }
        ];

        return statuses.map(s => `
            <button
                class="filter-tab ${currentStatus === s.key ? 'active' : ''}"
                data-status="${s.key}"
            >${s.label}<span class="count">${s.count}</span></button>
        `).join('');
    }

    _renderBooks(books, filters) {
        if (books.length === 0) {
            return `
                <bt-empty-state
                    title="No books found"
                    description="Try adjusting your search or filters"
                ></bt-empty-state>
            `;
        }

        const currentSort = filters.sort || 'date_added';
        const currentOrder = filters.order || 'desc';

        return `
            <div class="table-container">
                <div class="table-scroll">
                    <table class="books-table">
                        <thead>
                            <tr>
                                <th class="col-cover"></th>
                                <th class="sortable ${currentSort === 'title' ? 'sorted' : ''}" data-sort="title">
                                    Title
                                    <span class="sort-icon">${currentSort === 'title' ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9650;'}</span>
                                </th>
                                <th class="sortable ${currentSort === 'author' ? 'sorted' : ''}" data-sort="author">
                                    Author
                                    <span class="sort-icon">${currentSort === 'author' ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9650;'}</span>
                                </th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th class="sortable hide-mobile ${currentSort === 'my_rating' ? 'sorted' : ''}" data-sort="my_rating">
                                    Rating
                                    <span class="sort-icon">${currentSort === 'my_rating' ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9660;'}</span>
                                </th>
                                <th class="sortable hide-mobile ${currentSort === 'page_count' ? 'sorted' : ''}" data-sort="page_count">
                                    Pages
                                    <span class="sort-icon">${currentSort === 'page_count' ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9660;'}</span>
                                </th>
                                <th class="sortable hide-mobile ${currentSort === 'date_added' ? 'sorted' : ''}" data-sort="date_added">
                                    Added
                                    <span class="sort-icon">${currentSort === 'date_added' ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9660;'}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${books.map(book => this._renderBookRow(book)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _renderBookRow(book) {
        const progress = book.progress_percent || 0;
        const rating = book.my_rating ? this._renderStars(book.my_rating) : '<span class="no-rating">&#8211;</span>';
        const pages = book.page_count || '&#8211;';
        const dateAdded = book.date_added ? this._formatDate(book.date_added) : '&#8211;';

        return `
            <tr data-book-id="${book.book_id}">
                <td class="col-cover">
                    <img
                        class="cover-thumb"
                        src="${book.cover_image_url || ''}"
                        alt=""
                        onerror="this.style.visibility='hidden'"
                    >
                </td>
                <td class="col-title">
                    <span class="title-text">${this.escapeHtml(book.title)}</span>
                </td>
                <td class="col-author">
                    <span class="author-text">${this.escapeHtml(book.author || '')}</span>
                </td>
                <td>
                    <bt-status-badge status="${book.status}"></bt-status-badge>
                </td>
                <td class="col-progress">
                    <div class="progress-text">${progress}%</div>
                    <div class="progress-bar"><div class="fill" style="width: ${progress}%"></div></div>
                </td>
                <td class="col-rating hide-mobile">${rating}</td>
                <td class="col-pages hide-mobile">${pages}</td>
                <td class="col-date hide-mobile">${dateAdded}</td>
            </tr>
        `;
    }

    _renderStars(rating) {
        const filled = '&#9733;';
        const empty = '&#9734;';
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= rating ? filled : empty;
        }
        return stars;
    }

    _formatDate(dateStr) {
        if (!dateStr) return '&#8211;';
        try {
            const date = new Date(dateStr);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        } catch {
            return dateStr;
        }
    }

    afterRender() {
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

        // Sortable column headers
        this.$$('.books-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                this._handleColumnSort(th.dataset.sort);
            });
        });

        // Table row clicks
        this.$$('.books-table tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                const bookId = row.dataset.bookId;
                if (bookId) {
                    this.emit('show-book-detail', { bookId: parseInt(bookId, 10) });
                }
            });
        });

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

    _handleColumnSort(sortField) {
        const filters = store.get('filters') || {};
        const currentSort = filters.sort || 'date_added';
        const currentOrder = filters.order || 'desc';

        let newOrder;
        if (currentSort === sortField) {
            // Toggle order if clicking same column
            newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // Default order for new column
            newOrder = (sortField === 'title' || sortField === 'author') ? 'asc' : 'desc';
        }

        router.updateParams({ sort: sortField, order: newOrder, page: 1 });
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
