/**
 * bt-settings-view - Settings page with cover management
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { api } from '../services/api-client.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-cover-fetch-progress.js';

export class BtSettingsView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            missingCovers: [],
            missingCount: 0,
            showFetchProgress: false,
            // Database browser state
            queryInput: '',
            queryResult: null,
            queryError: null,
            queryLoading: false
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            h1 {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text, #2C2416);
                margin-bottom: 32px;
            }

            .section {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 8px;
                padding: 24px;
                margin-bottom: 24px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            h2 {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text, #2C2416);
                margin: 0;
            }

            .count-badge {
                background: var(--accent, #8B4513);
                color: white;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .count-badge.success {
                background: var(--green, #2E7D4A);
            }

            .description {
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
                margin-bottom: 20px;
            }

            .actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            button {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
                transition: background 0.15s ease;
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

            /* Book list */
            .book-list {
                margin-top: 24px;
                border-top: 1px solid var(--border, #D4C9B8);
                padding-top: 24px;
            }

            .book-list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .book-list h3 {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-muted, #8B7E6A);
                margin: 0;
            }

            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 12px;
                max-height: 400px;
                overflow-y: auto;
            }

            .book-item {
                display: flex;
                gap: 12px;
                align-items: center;
                padding: 12px;
                background: var(--surface, #FFFFFF);
                border: 1px solid var(--border-subtle, #E5DED2);
                border-radius: 6px;
                cursor: pointer;
                transition: border-color 0.15s ease;
            }

            .book-item:hover {
                border-color: var(--accent, #8B4513);
            }

            .book-cover-placeholder {
                width: 40px;
                height: 60px;
                background: var(--bg-tertiary, #EDE6DB);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-muted, #8B7E6A);
                font-size: 1.5rem;
                flex-shrink: 0;
            }

            .book-info {
                flex: 1;
                min-width: 0;
            }

            .book-title {
                font-weight: 600;
                font-size: 0.875rem;
                color: var(--text, #2C2416);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .book-author {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .book-action {
                color: var(--accent, #8B4513);
                font-size: 0.75rem;
                white-space: nowrap;
            }

            /* Database Browser Styles */
            .query-section {
                margin-top: 24px;
            }

            .query-input-wrapper {
                position: relative;
            }

            .query-textarea {
                width: 100%;
                min-height: 120px;
                padding: 12px;
                background: var(--surface, #FFFFFF);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.875rem;
                color: var(--text, #2C2416);
                resize: vertical;
                box-sizing: border-box;
            }

            .query-textarea:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            .query-textarea::placeholder {
                color: var(--text-muted, #8B7E6A);
            }

            .query-result {
                margin-top: 16px;
            }

            .query-meta {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 8px;
            }

            .query-error {
                background: rgba(220, 38, 38, 0.1);
                border: 1px solid rgba(220, 38, 38, 0.3);
                border-radius: 6px;
                padding: 12px;
                color: #dc2626;
                font-size: 0.875rem;
                font-family: var(--font-mono, monospace);
            }

            .result-table-wrapper {
                overflow-x: auto;
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                background: var(--surface, #FFFFFF);
            }

            .result-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.8125rem;
            }

            .result-table th,
            .result-table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid var(--border-subtle, #E5DED2);
                white-space: nowrap;
            }

            .result-table th {
                background: var(--bg-secondary, #F5F0E8);
                font-weight: 600;
                color: var(--text, #2C2416);
                position: sticky;
                top: 0;
            }

            .result-table td {
                font-family: var(--font-mono, monospace);
                color: var(--text-secondary, #5C5244);
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .result-table tr:hover td {
                background: var(--bg-secondary, #F5F0E8);
            }

            .result-table tr:last-child td {
                border-bottom: none;
            }

            .null-value {
                color: var(--text-muted, #8B7E6A);
                font-style: italic;
            }

            @media (max-width: 768px) {
                .section-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .actions {
                    width: 100%;
                }

                .actions button {
                    flex: 1;
                }
            }
        `;
    }

    template() {
        const { loading, error, missingCovers, missingCount, showFetchProgress, queryResult, queryError, queryLoading } = this.state;

        if (loading) {
            return '<bt-loading text="Loading settings..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load settings"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        return `
            <h1>Settings</h1>

            <div class="section">
                <div class="section-header">
                    <h2>Cover Management</h2>
                    <span class="count-badge ${missingCount === 0 ? 'success' : ''}">${missingCount === 0 ? 'All covers found' : `${missingCount} need covers`}</span>
                </div>

                <p class="description">
                    Automatically fetch book covers from Open Library for books in your collection that don't have covers yet.
                </p>

                ${showFetchProgress ? `
                    <bt-cover-fetch-progress ref="fetchProgress"></bt-cover-fetch-progress>
                ` : `
                    <div class="actions">
                        <button class="primary" ref="fetchAllBtn" ${missingCount === 0 ? 'disabled' : ''}>
                            Fetch All Covers
                        </button>
                    </div>
                `}

                ${missingCount > 0 && !showFetchProgress ? `
                    <div class="book-list">
                        <div class="book-list-header">
                            <h3>Books Without Covers</h3>
                        </div>
                        <div class="books-grid">
                            ${missingCovers.slice(0, 20).map(book => `
                                <div class="book-item" data-book-id="${book.book_id}">
                                    <div class="book-cover-placeholder">?</div>
                                    <div class="book-info">
                                        <div class="book-title">${this.escapeHtml(book.title)}</div>
                                        <div class="book-author">${this.escapeHtml(book.author)}</div>
                                    </div>
                                    <span class="book-action">Find Cover</span>
                                </div>
                            `).join('')}
                        </div>
                        ${missingCount > 20 ? `<p class="description" style="margin-top: 12px;">...and ${missingCount - 20} more</p>` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>Database Browser</h2>
                </div>

                <p class="description">
                    Execute read-only SQL queries against the database for debugging and data exploration.
                    Only SELECT queries are allowed.
                </p>

                <div class="query-section">
                    <div class="query-input-wrapper">
                        <textarea
                            class="query-textarea"
                            ref="queryTextarea"
                            placeholder="SELECT * FROM library_view LIMIT 10"
                        ></textarea>
                    </div>

                    <div class="actions" style="margin-top: 12px;">
                        <button class="primary" ref="runQueryBtn" ${queryLoading ? 'disabled' : ''}>
                            ${queryLoading ? 'Running...' : 'Run Query'}
                        </button>
                        <button ref="clearQueryBtn">Clear</button>
                    </div>

                    ${queryError ? `
                        <div class="query-result">
                            <div class="query-error">${this.escapeHtml(queryError)}</div>
                        </div>
                    ` : ''}

                    ${queryResult ? `
                        <div class="query-result">
                            <div class="query-meta">
                                ${queryResult.row_count} row${queryResult.row_count !== 1 ? 's' : ''} returned
                                ${queryResult.truncated ? ' (limited to 1000 rows)' : ''}
                            </div>
                            ${queryResult.rows.length > 0 ? `
                                <div class="result-table-wrapper" style="max-height: 400px; overflow-y: auto;">
                                    <table class="result-table">
                                        <thead>
                                            <tr>
                                                ${queryResult.columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${queryResult.rows.map(row => `
                                                <tr>
                                                    ${queryResult.columns.map(col => `
                                                        <td>${row[col] === null ? '<span class="null-value">NULL</span>' : this.escapeHtml(String(row[col]))}</td>
                                                    `).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : '<p class="description">Query returned no results.</p>'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    afterRender() {
        const fetchAllBtn = this.ref('fetchAllBtn');
        if (fetchAllBtn) {
            fetchAllBtn.addEventListener('click', () => this._startBatchFetch());
        }

        // Handle individual book clicks - open cover picker
        this.$$('.book-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = parseInt(item.dataset.bookId);
                this.emit('change-cover', { bookId });
            });
        });

        // Handle fetch progress events
        const fetchProgress = this.ref('fetchProgress');
        if (fetchProgress) {
            fetchProgress.addEventListener('fetch-complete', () => {
                this.setState({ showFetchProgress: false });
                this._loadData();
                this.emit('toast', { message: 'Cover fetch complete', type: 'success' });
            });

            fetchProgress.addEventListener('fetch-cancel', () => {
                this.setState({ showFetchProgress: false });
                this._loadData();
            });

            // Start the fetch
            fetchProgress.startFetch();
        }

        // Database browser handlers
        const runQueryBtn = this.ref('runQueryBtn');
        const clearQueryBtn = this.ref('clearQueryBtn');
        const queryTextarea = this.ref('queryTextarea');

        if (runQueryBtn && queryTextarea) {
            runQueryBtn.addEventListener('click', () => this._executeQuery(queryTextarea.value));

            // Allow Ctrl+Enter to run query
            queryTextarea.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this._executeQuery(queryTextarea.value);
                }
            });
        }

        if (clearQueryBtn && queryTextarea) {
            clearQueryBtn.addEventListener('click', () => {
                queryTextarea.value = '';
                this.setState({ queryResult: null, queryError: null });
            });
        }
    }

    _startBatchFetch() {
        this.setState({ showFetchProgress: true });
    }

    async _executeQuery(query) {
        if (!query || !query.trim()) {
            this.setState({ queryError: 'Please enter a query', queryResult: null });
            return;
        }

        this.setState({ queryLoading: true, queryError: null, queryResult: null });

        try {
            const result = await api.executeQuery(query.trim());
            this.setState({ queryLoading: false, queryResult: result, queryError: null });
        } catch (error) {
            console.error('Query error:', error);
            // Try to get error message from response
            let errorMessage = 'Query failed';
            if (error.message) {
                errorMessage = error.message;
            }
            this.setState({ queryLoading: false, queryError: errorMessage, queryResult: null });
        }
    }

    async onConnect() {
        await this._loadData();
    }

    async _loadData() {
        this.setState({ loading: true, error: null });

        try {
            const data = await api.getMissingCovers();
            this.setState({
                loading: false,
                missingCovers: data.books || [],
                missingCount: data.count || 0
            });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load cover data'
            });
            console.error('Settings error:', error);
        }
    }

    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-settings-view', BtSettingsView);
