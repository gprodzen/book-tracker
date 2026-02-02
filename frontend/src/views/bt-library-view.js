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

// Column configuration
const ALL_COLUMNS = [
    { key: 'cover', label: '', sortable: false, hideable: false, className: 'col-cover' },
    { key: 'title', label: 'Title', sortable: true, hideable: false, className: 'col-title' },
    { key: 'author', label: 'Author', sortable: true, hideable: true, className: 'col-author' },
    { key: 'status', label: 'Status', sortable: true, hideable: true, className: '' },
    { key: 'progress', label: 'Progress', sortable: true, sortKey: 'progress_percent', hideable: true, className: 'col-progress' },
    { key: 'rating', label: 'Rating', sortable: true, sortKey: 'my_rating', hideable: true, className: 'col-rating hide-mobile' },
    { key: 'pages', label: 'Pages', sortable: true, sortKey: 'page_count', hideable: true, className: 'col-pages hide-mobile' },
    { key: 'added', label: 'Added', sortable: true, sortKey: 'date_added', hideable: true, className: 'col-date hide-mobile' }
];

const DEFAULT_VISIBLE_COLUMNS = ['cover', 'title', 'author', 'status', 'progress', 'rating', 'pages', 'added'];
const STORAGE_KEY_COLUMNS = 'library_visible_columns';

export class BtLibraryView extends BaseComponent {
    constructor() {
        super();

        // Load saved column visibility
        const savedColumns = this._loadVisibleColumns();

        this.setState({
            loading: true,
            error: null,
            books: [],
            stats: null,
            paths: [],
            pagination: {
                page: 1,
                perPage: 50,
                total: 0,
                pages: 1
            },
            visibleColumns: savedColumns,
            showColumnSettings: false
        });

        this._debouncedSearch = this.debounce(this._handleSearch.bind(this), 300);
    }

    _loadVisibleColumns() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load column settings:', e);
        }
        return DEFAULT_VISIBLE_COLUMNS;
    }

    _saveVisibleColumns(columns) {
        try {
            localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columns));
        } catch (e) {
            console.error('Failed to save column settings:', e);
        }
    }

    styles() {
        return `
            :host {
                display: block;
            }

            /* ==========================================================================
               Layout
               ========================================================================== */
            .library-layout {
                display: grid;
                grid-template-columns: 220px 1fr;
                gap: 24px;
            }

            /* ==========================================================================
               Filter Panel (Left Sidebar)
               ========================================================================== */
            .filter-panel {
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: 8px;
                padding: 16px;
                height: fit-content;
                position: sticky;
                top: 16px;
            }

            .filter-section {
                margin-bottom: 20px;
            }

            .filter-section:last-child {
                margin-bottom: 0;
            }

            .filter-section-title {
                font-size: 0.6875rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-muted, #8B7E6A);
                margin-bottom: 8px;
            }

            .filter-list {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .filter-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s ease-out;
                border: none;
                background: transparent;
                width: 100%;
                text-align: left;
                font-family: inherit;
                font-size: 0.875rem;
                color: var(--color-text-secondary, #5C5244);
            }

            .filter-item:hover {
                background: var(--color-bg-secondary, #F5F0E8);
            }

            .filter-item.active {
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-primary, #2C2416);
                font-weight: 500;
            }

            .filter-item .count {
                font-family: var(--font-mono, monospace);
                font-size: 0.75rem;
                color: var(--color-text-muted, #8B7E6A);
            }

            .filter-item.active .count {
                color: var(--color-accent, #8B4513);
            }

            .path-color {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
                flex-shrink: 0;
            }

            .path-name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* ==========================================================================
               Main Content
               ========================================================================== */
            .library-main {
                min-width: 0;
            }

            /* ==========================================================================
               Controls
               ========================================================================== */
            .controls {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                align-items: center;
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
                font-family: var(--font-body, 'IBM Plex Sans', sans-serif);
                font-size: 0.875rem;
            }

            .search-box input:focus {
                outline: none;
                border-color: var(--color-accent, #8B4513);
            }

            .controls-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: auto;
            }

            .btn {
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                color: var(--color-text-primary, #2C2416);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-family: var(--font-body, 'IBM Plex Sans', sans-serif);
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

            .btn-icon {
                padding: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* ==========================================================================
               Column Settings Dropdown
               ========================================================================== */
            .column-settings-wrapper {
                position: relative;
            }

            .column-settings-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 4px;
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: 8px;
                padding: 8px 0;
                min-width: 180px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                z-index: 100;
            }

            .column-settings-dropdown.hidden {
                display: none;
            }

            .column-option {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 0.875rem;
                color: var(--color-text-secondary, #5C5244);
                transition: background 0.1s;
            }

            .column-option:hover {
                background: var(--color-bg-secondary, #F5F0E8);
            }

            .column-option input[type="checkbox"] {
                cursor: pointer;
            }

            .column-option.disabled {
                opacity: 0.5;
                cursor: not-allowed;
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
            @media (max-width: 900px) {
                .library-layout {
                    grid-template-columns: 1fr;
                }

                .filter-panel {
                    position: static;
                    display: flex;
                    gap: 16px;
                    overflow-x: auto;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                }

                .filter-section {
                    margin-bottom: 0;
                    min-width: max-content;
                }

                .filter-section-title {
                    margin-bottom: 6px;
                }

                .filter-list {
                    flex-direction: row;
                    gap: 4px;
                }

                .filter-item {
                    padding: 6px 12px;
                    white-space: nowrap;
                }
            }

            @media (max-width: 768px) {
                .controls {
                    flex-direction: column;
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
        const { loading, error, books, stats, paths, pagination, visibleColumns, showColumnSettings } = this.state;
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
            <div class="library-layout">
                <aside class="filter-panel">
                    <div class="filter-section">
                        <div class="filter-section-title">Status</div>
                        <div class="filter-list">
                            ${this._renderStatusFilters(stats, filters.status)}
                        </div>
                    </div>

                    ${paths && paths.length > 0 ? `
                        <div class="filter-section">
                            <div class="filter-section-title">Objectives</div>
                            <div class="filter-list">
                                ${paths.map(path => `
                                    <button class="filter-item ${filters.path == path.id ? 'active' : ''}" data-path-id="${path.id}">
                                        <span class="path-color" style="background: ${path.color || '#8B4513'}"></span>
                                        <span class="path-name">${this.escapeHtml(path.name)}</span>
                                        <span class="count">${path.total_books || 0}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </aside>

                <main class="library-main">
                    <div class="controls">
                        <div class="search-box">
                            <input
                                type="text"
                                ref="searchInput"
                                placeholder="Search books by title or author..."
                                value="${this.escapeHtml(filters.search || '')}"
                            >
                        </div>
                        <div class="controls-actions">
                            <button ref="addBookBtn" class="btn primary">Add Book</button>
                            <div class="column-settings-wrapper">
                                <button ref="columnSettingsBtn" class="btn btn-icon" title="Column settings">
                                    &#9881;
                                </button>
                                <div class="column-settings-dropdown ${showColumnSettings ? '' : 'hidden'}" ref="columnDropdown">
                                    ${ALL_COLUMNS.filter(col => col.hideable).map(col => `
                                        <label class="column-option ${col.hideable ? '' : 'disabled'}">
                                            <input
                                                type="checkbox"
                                                data-column="${col.key}"
                                                ${visibleColumns.includes(col.key) ? 'checked' : ''}
                                                ${col.hideable ? '' : 'disabled'}
                                            >
                                            ${col.label}
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref="booksContainer">
                        ${loading ? '<bt-loading text="Loading books..."></bt-loading>' : this._renderBooks(books, filters, visibleColumns)}
                    </div>

                    ${!loading && pagination.pages > 1 ? `
                        <div class="pagination">
                            <button ref="prevBtn" class="btn" ${pagination.page <= 1 ? 'disabled' : ''}>Previous</button>
                            <span class="page-info">Page ${pagination.page} of ${pagination.pages}</span>
                            <button ref="nextBtn" class="btn" ${pagination.page >= pagination.pages ? 'disabled' : ''}>Next</button>
                        </div>
                    ` : ''}
                </main>
            </div>
        `;
    }

    _renderStatusFilters(stats, currentStatus) {
        const statuses = [
            { key: '', label: 'All Books', count: stats?.total_books || 0 },
            { key: 'reading', label: 'Reading', count: stats?.by_status?.reading || 0 },
            { key: 'queued', label: 'Queued', count: stats?.by_status?.queued || 0 },
            { key: 'want_to_read', label: 'Want to Read', count: stats?.by_status?.want_to_read || 0 },
            { key: 'finished', label: 'Finished', count: stats?.by_status?.finished || 0 },
            { key: 'abandoned', label: 'Abandoned', count: stats?.by_status?.abandoned || 0 }
        ];

        return statuses.map(s => `
            <button
                class="filter-item ${currentStatus === s.key ? 'active' : ''}"
                data-status="${s.key}"
            >
                <span>${s.label}</span>
                <span class="count">${s.count}</span>
            </button>
        `).join('');
    }

    _renderBooks(books, filters, visibleColumns) {
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

        // Get visible columns configuration
        const columns = ALL_COLUMNS.filter(col => visibleColumns.includes(col.key));

        return `
            <div class="table-container">
                <div class="table-scroll">
                    <table class="books-table">
                        <thead>
                            <tr>
                                ${columns.map(col => {
                                    const sortKey = col.sortKey || col.key;
                                    const isSorted = currentSort === sortKey;
                                    const sortClass = col.sortable ? 'sortable' : '';
                                    const sortedClass = isSorted ? 'sorted' : '';

                                    if (!col.label) {
                                        return `<th class="${col.className}"></th>`;
                                    }

                                    if (!col.sortable) {
                                        return `<th class="${col.className}">${col.label}</th>`;
                                    }

                                    return `
                                        <th class="${sortClass} ${sortedClass} ${col.className}" data-sort="${sortKey}">
                                            ${col.label}
                                            <span class="sort-icon">${isSorted ? (currentOrder === 'asc' ? '&#9650;' : '&#9660;') : '&#9650;'}</span>
                                        </th>
                                    `;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${books.map(book => this._renderBookRow(book, visibleColumns)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _renderBookRow(book, visibleColumns) {
        const progress = book.progress_percent || 0;
        const rating = book.my_rating ? this._renderStars(book.my_rating) : '<span class="no-rating">&#8211;</span>';
        const pages = book.page_count || '&#8211;';
        const dateAdded = book.date_added ? this._formatDate(book.date_added) : '&#8211;';

        const cellRenderers = {
            cover: `
                <td class="col-cover">
                    <img
                        class="cover-thumb"
                        src="${book.cover_image_url || ''}"
                        alt=""
                        onerror="this.style.visibility='hidden'"
                    >
                </td>
            `,
            title: `
                <td class="col-title">
                    <span class="title-text">${this.escapeHtml(book.title)}</span>
                </td>
            `,
            author: `
                <td class="col-author">
                    <span class="author-text">${this.escapeHtml(book.author || '')}</span>
                </td>
            `,
            status: `
                <td>
                    <bt-status-badge status="${book.status}"></bt-status-badge>
                </td>
            `,
            progress: `
                <td class="col-progress">
                    <div class="progress-text">${progress}%</div>
                    <div class="progress-bar"><div class="fill" style="width: ${progress}%"></div></div>
                </td>
            `,
            rating: `<td class="col-rating hide-mobile">${rating}</td>`,
            pages: `<td class="col-pages hide-mobile">${pages}</td>`,
            added: `<td class="col-date hide-mobile">${dateAdded}</td>`
        };

        return `
            <tr data-book-id="${book.book_id}">
                ${visibleColumns.map(col => cellRenderers[col] || '').join('')}
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
            this.addListener(searchInput, 'input', () => {
                this._debouncedSearch(searchInput.value);
            });
        }

        // Add book button
        this.addListener(this.ref('addBookBtn'), 'click', () => {
            this.emit('add-book');
        });

        // Status filters (sidebar)
        this.$$('.filter-item[data-status]').forEach(item => {
            this.addListener(item, 'click', () => {
                this._handleFilterChange(item.dataset.status);
            });
        });

        // Path filters (sidebar)
        this.$$('.filter-item[data-path-id]').forEach(item => {
            this.addListener(item, 'click', () => {
                this._handlePathFilter(item.dataset.pathId);
            });
        });

        // Column settings button and dropdown
        const columnSettingsBtn = this.ref('columnSettingsBtn');
        const columnDropdown = this.ref('columnDropdown');

        if (columnSettingsBtn && columnDropdown) {
            this.addListener(columnSettingsBtn, 'click', (e) => {
                e.stopPropagation();
                this.setState({ showColumnSettings: !this.state.showColumnSettings });
            });

            // Column checkboxes
            columnDropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                this.addListener(checkbox, 'change', () => {
                    const columnKey = checkbox.dataset.column;
                    let newColumns = [...this.state.visibleColumns];

                    if (checkbox.checked) {
                        if (!newColumns.includes(columnKey)) {
                            // Insert in correct order based on ALL_COLUMNS
                            const allKeys = ALL_COLUMNS.map(c => c.key);
                            const insertIndex = allKeys.indexOf(columnKey);
                            let insertPosition = 0;
                            for (let i = 0; i < newColumns.length; i++) {
                                if (allKeys.indexOf(newColumns[i]) < insertIndex) {
                                    insertPosition = i + 1;
                                }
                            }
                            newColumns.splice(insertPosition, 0, columnKey);
                        }
                    } else {
                        newColumns = newColumns.filter(k => k !== columnKey);
                    }

                    this._saveVisibleColumns(newColumns);
                    this.setState({ visibleColumns: newColumns });
                });
            });

            // Close dropdown when clicking outside - use document listener with cleanup
            if (!this._documentClickHandler) {
                this._documentClickHandler = (e) => {
                    const dropdown = this.ref('columnDropdown');
                    const btn = this.ref('columnSettingsBtn');
                    if (this.state.showColumnSettings && dropdown && btn &&
                        !dropdown.contains(e.target) && e.target !== btn) {
                        this.setState({ showColumnSettings: false });
                    }
                };
                document.addEventListener('click', this._documentClickHandler);
            }
        }

        // Sortable column headers
        this.$$('.books-table th.sortable').forEach(th => {
            this.addListener(th, 'click', () => {
                this._handleColumnSort(th.dataset.sort);
            });
        });

        // Table row clicks
        this.$$('.books-table tbody tr').forEach(row => {
            this.addListener(row, 'click', () => {
                const bookId = row.dataset.bookId;
                if (bookId) {
                    this.emit('show-book-detail', { bookId: parseInt(bookId, 10) });
                }
            });
        });

        // Pagination
        this.addListener(this.ref('prevBtn'), 'click', () => this._handlePageChange(-1));
        this.addListener(this.ref('nextBtn'), 'click', () => this._handlePageChange(1));
    }

    async onConnect() {
        // Load stats and paths in parallel
        try {
            const [stats, paths] = await Promise.all([
                api.getStats(),
                api.getPaths()
            ]);
            this.setState({ stats, paths });
        } catch (e) {
            console.error('Failed to load stats/paths:', e);
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
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
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
                path: filters.path,
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
        router.updateParams({ status, path: '', page: 1 });
    }

    _handlePathFilter(pathId) {
        const filters = store.get('filters') || {};
        // Toggle path filter
        const newPathId = filters.path == pathId ? '' : pathId;
        router.updateParams({ path: newPathId, status: '', page: 1 });
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

    async refresh() {
        await this._loadBooks();
    }
}

defineComponent('bt-library-view', BtLibraryView);
