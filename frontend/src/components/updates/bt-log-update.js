/**
 * bt-log-update - State-first progress update form
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtLogUpdate extends BaseComponent {
    static get observedAttributes() {
        return ['book-id', 'show-cancel'];
    }

    constructor() {
        super();
        this._currentPage = '';
        this._currentPercent = '';
        this._note = '';
        this._markFinished = false;
        this._autoFinished = false;
        this._searchQuery = '';
        this._searchTimeout = null;

        this.setState({
            loading: false,
            saving: false,
            error: null,
            book: null,
            suggestions: [],
            searchResults: [],
            searching: false,
            inputMode: 'page'
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .log-update {
                display: flex;
                flex-direction: column;
                gap: var(--space-4, 16px);
            }

            .log-update-panel {
                background: var(--color-surface, #ffffff);
                border: 1px solid var(--color-border, #e3ddd1);
                border-radius: var(--radius-xl, 18px);
                padding: var(--space-5, 20px);
                box-shadow: var(--shadow-md, 0 8px 18px rgba(40, 32, 20, 0.08));
                display: flex;
                flex-direction: column;
                gap: var(--space-4, 16px);
            }

            .section-label {
                font-size: var(--text-xs, 0.75rem);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.05em);
                color: var(--color-text-muted, #8a7d6b);
                font-weight: var(--font-semibold, 600);
            }

            .book-pill {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-4, 16px);
                padding: var(--space-3, 12px) var(--space-4, 16px);
                background: var(--color-bg-tertiary, #fbfaf8);
                border-radius: var(--radius-lg, 14px);
                border: 1px solid var(--color-border, #e3ddd1);
            }

            .book-meta {
                min-width: 0;
            }

            .book-title {
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
                font-size: var(--text-lg, 1.125rem);
                font-family: var(--font-display, 'Libre Baskerville', serif);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .book-author {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8a7d6b);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .ghost-btn {
                background: transparent;
                border: 1px solid var(--color-border, #e3ddd1);
                color: var(--color-text-secondary, #6b6051);
                padding: 6px 12px;
                border-radius: var(--radius-md, 10px);
                font-size: var(--text-sm, 0.875rem);
                cursor: pointer;
                transition: var(--transition-colors);
            }

            .ghost-btn:hover {
                color: var(--color-text-primary, #2b2418);
                border-color: var(--color-border-emphasis, #d5cbbd);
            }

            .book-search {
                display: grid;
                gap: var(--space-2, 8px);
            }

            .results {
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
                max-height: 220px;
                overflow-y: auto;
            }

            .result-item {
                padding: var(--space-3, 12px);
                border-radius: var(--radius-md, 10px);
                border: 1px solid var(--color-border-subtle, #efe9df);
                background: var(--color-surface, #ffffff);
                cursor: pointer;
                transition: var(--transition-colors), var(--transition-shadow);
            }

            .result-item:hover {
                border-color: var(--color-accent, #8b5e34);
                box-shadow: var(--shadow-sm, 0 1px 2px rgba(40, 32, 20, 0.04));
            }

            .result-title {
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
            }

            .result-author {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .log-update-grid {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                gap: var(--space-5, 20px);
            }

            .panel {
                display: grid;
                gap: var(--space-3, 12px);
                padding: var(--space-4, 16px);
                border-radius: var(--radius-lg, 14px);
                border: 1px solid var(--color-border-subtle, #efe9df);
                background: var(--color-bg-tertiary, #fbfaf8);
            }

            .mode-toggle {
                display: inline-flex;
                gap: var(--space-2, 8px);
                background: var(--color-bg-secondary, #f1ede6);
                padding: 4px;
                border-radius: var(--radius-full, 9999px);
                border: 1px solid var(--color-border-subtle, #efe9df);
            }

            .mode-btn {
                border: none;
                background: transparent;
                padding: 6px 14px;
                border-radius: var(--radius-full, 9999px);
                font-size: var(--text-sm, 0.875rem);
                cursor: pointer;
                color: var(--color-text-secondary, #6b6051);
                transition: var(--transition-colors), var(--transition-shadow);
            }

            .mode-btn.active {
                background: var(--color-surface, #ffffff);
                color: var(--color-text-primary, #2b2418);
                box-shadow: var(--shadow-sm, 0 1px 2px rgba(40, 32, 20, 0.06));
            }

            .input-row {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: var(--space-3, 12px);
                align-items: end;
            }

            .field-label {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-secondary, #6b6051);
                font-weight: var(--font-medium, 500);
            }

            .input-help {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .meta-inline {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
                padding-bottom: 6px;
                text-align: right;
            }

            .preview {
                padding: var(--space-3, 12px) var(--space-4, 16px);
                border-radius: var(--radius-md, 10px);
                background: var(--color-surface, #ffffff);
                border: 1px solid var(--color-border-subtle, #efe9df);
                display: none;
                gap: var(--space-2, 8px);
            }

            .preview-label {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .preview-value {
                font-weight: var(--font-semibold, 600);
                color: var(--color-accent, #8b5e34);
                font-size: var(--text-base, 1rem);
            }

            .progress-bar {
                height: 10px;
                border-radius: var(--radius-full, 9999px);
                background: var(--color-bg-secondary, #f1ede6);
                border: 1px solid var(--color-border, #e3ddd1);
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, var(--color-accent, #8b5e34), var(--color-accent-hover, #9a6a3e));
                border-radius: inherit;
                transition: width var(--duration-normal, 250ms) var(--ease-out);
            }

            .progress-meta {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .checkbox-row {
                display: flex;
                align-items: center;
                gap: var(--space-2, 8px);
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-secondary, #6b6051);
            }

            .actions-row {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-2, 8px);
                flex-wrap: wrap;
            }

            .error {
                color: var(--color-error, #c7514d);
                font-size: var(--text-sm, 0.875rem);
                padding: var(--space-2, 8px) var(--space-3, 12px);
                border-radius: var(--radius-md, 10px);
                background: var(--color-error-muted, rgba(199, 81, 77, 0.15));
            }

            .log-update input,
            .log-update textarea {
                background: #ffffff;
                border: 1px solid var(--color-border, #e3ddd1);
                border-radius: var(--radius-md, 10px);
                padding: var(--space-3, 12px);
                color: var(--color-text-primary, #2b2418);
            }

            .log-update input:focus,
            .log-update textarea:focus {
                outline: none;
                border-color: var(--color-accent, #8b5e34);
                box-shadow: 0 0 0 3px var(--color-accent-muted, rgba(139, 94, 52, 0.15));
            }

            .log-update textarea {
                min-height: 120px;
            }

            .actions-row button {
                border-radius: var(--radius-md, 10px);
                padding: 10px 16px;
                font-weight: var(--font-medium, 500);
                font-size: var(--text-sm, 0.875rem);
                border: 1px solid var(--color-border, #e3ddd1);
                background: var(--color-bg-secondary, #f1ede6);
                color: var(--color-text-primary, #2b2418);
                cursor: pointer;
                transition: var(--transition-colors), var(--transition-shadow), transform var(--duration-fast, 150ms) var(--ease-spring-snappy, cubic-bezier(0.175, 0.885, 0.32, 1.275));
            }

            .actions-row button:hover:not(:disabled) {
                transform: translateY(-1px);
                background: var(--color-bg-tertiary, #fbfaf8);
            }

            .actions-row button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                box-shadow: none;
            }

            .actions-row button.primary {
                background: var(--color-accent, #8b5e34);
                border-color: var(--color-accent, #8b5e34);
                color: var(--color-text-inverse, #ffffff);
                box-shadow: var(--shadow-button-glow, 0 6px 16px rgba(139, 94, 52, 0.25));
            }

            .actions-row button.primary:hover:not(:disabled) {
                background: var(--color-accent-hover, #9a6a3e);
                border-color: var(--color-accent-hover, #9a6a3e);
            }

            .actions-row button.secondary {
                background: transparent;
                border-color: var(--color-border, #e3ddd1);
                color: var(--color-text-secondary, #6b6051);
                box-shadow: none;
            }

            @media (max-width: 600px) {
                .input-row {
                    grid-template-columns: 1fr;
                }

                .meta-inline {
                    text-align: left;
                }
            }

            @media (max-width: 720px) {
                .log-update-grid {
                    grid-template-columns: 1fr;
                }

                .log-update-panel {
                    padding: var(--space-4, 16px);
                }
            }
        `;
    }

    template() {
        const { book, error, saving, searching, inputMode, searchResults, suggestions } = this.state;
        const showCancel = this.hasAttribute('show-cancel');
        const hasBook = !!book;
        const allowChange = hasBook && !this.hasAttribute('book-id');
        const inputsDisabled = !hasBook;

        return `
            <div class="log-update">
                ${error ? `<div class="error">${this.escapeHtml(error)}</div>` : ''}
                <div class="log-update-panel">
                    ${hasBook ? `
                        <div class="book-pill">
                            <div class="book-meta">
                                <div class="book-title">${this.escapeHtml(book.title)}</div>
                                <div class="book-author">${this.escapeHtml(book.author)}</div>
                            </div>
                            ${allowChange ? `<button class="ghost-btn" ref="changeBookBtn">Change</button>` : ''}
                        </div>
                    ` : `
                        <div class="book-search">
                            <div class="section-label">Book</div>
                            <input
                                type="search"
                                ref="searchInput"
                                placeholder="Search your library"
                                value="${this.escapeHtml(this._searchQuery)}"
                            >
                            <div class="results">
                                ${(searching ? '<div class="input-help">Searching...</div>' : '')}
                                ${this._renderResults(searchResults.length ? searchResults : suggestions)}
                            </div>
                        </div>
                    `}

                    <div class="log-update-grid">
                        <div class="panel">
                            <div class="section-label">Progress</div>
                            <div class="mode-toggle" role="group" aria-label="Progress mode">
                                <button class="mode-btn ${inputMode === 'page' ? 'active' : ''}" data-mode="page" ${inputsDisabled ? 'disabled' : ''}>By page</button>
                                <button class="mode-btn ${inputMode === 'percent' ? 'active' : ''}" data-mode="percent" ${inputsDisabled ? 'disabled' : ''}>By percent</button>
                            </div>

                            ${inputMode === 'page' ? this._renderPageInput(book, inputsDisabled) : this._renderPercentInput(book, inputsDisabled)}

                            <div class="preview" ref="previewSection">
                                <div class="preview-label">Preview</div>
                                <div class="preview-value" ref="previewValue"></div>
                                <div class="progress-bar">
                                    <div class="progress-fill" ref="progressFill"></div>
                                </div>
                                <div class="progress-meta" ref="progressMeta"></div>
                            </div>
                        </div>

                        <div class="panel">
                            <div class="section-label">Note</div>
                            <textarea
                                id="note"
                                ref="noteInput"
                                placeholder="Add a note (optional)"
                                ${inputsDisabled ? 'disabled' : ''}
                            >${this.escapeHtml(this._note)}</textarea>

                            <div ${hasBook ? '' : 'hidden'}>
                                <label class="checkbox-row">
                                    <input type="checkbox" ref="finishedCheckbox" ${this._markFinished ? 'checked' : ''} ${this._autoFinished ? 'disabled' : ''}>
                                    <span>Mark finished</span>
                                </label>
                            </div>

                            <div class="actions-row">
                                ${showCancel ? `<button class="secondary" type="button" ref="cancelBtn">Cancel</button>` : ''}
                                <button class="primary" type="button" ref="saveBtn" ${saving ? 'disabled' : ''}>
                                    ${saving ? 'Saving...' : 'Log Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderResults(list) {
        if (!list || list.length === 0) {
            return '<div class="input-help">No matches yet. Start typing to search.</div>';
        }

        return list.map(item => `
            <div class="result-item" data-book-id="${item.book_id}">
                <div class="result-title">${this.escapeHtml(item.title)}</div>
                <div class="result-author">${this.escapeHtml(item.author)}</div>
            </div>
        `).join('');
    }

    _renderPageInput(book, disabled) {
        const currentPage = book?.current_page || 0;
        const pageCount = book?.page_count || 0;
        return `
            <div class="input-row">
                <div>
                    <label class="field-label" for="current-page">Current page</label>
                    <input
                        id="current-page"
                        type="number"
                        ref="pageInput"
                        min="0"
                        placeholder="${currentPage}"
                        value="${this._currentPage}"
                        ${disabled ? 'disabled' : ''}
                    >
                    <div class="input-help">${pageCount ? `of ${pageCount} pages` : 'Page count unknown'}</div>
                </div>
                <div class="meta-inline">${currentPage ? `Previous: ${currentPage}` : 'No prior page'}</div>
            </div>
        `;
    }

    _renderPercentInput(book, disabled) {
        const currentPercent = book?.progress_percent || 0;
        return `
            <div class="input-row">
                <div>
                    <label class="field-label" for="current-percent">Current percent</label>
                    <input
                        id="current-percent"
                        type="number"
                        ref="percentInput"
                        min="0"
                        max="100"
                        placeholder="${currentPercent}"
                        value="${this._currentPercent}"
                        ${disabled ? 'disabled' : ''}
                    >
                    <div class="input-help">0 to 100</div>
                </div>
                <div class="meta-inline">${currentPercent ? `Previous: ${currentPercent}%` : 'No prior percent'}</div>
            </div>
        `;
    }

    afterRender() {
        const { inputMode } = this.state;

        const searchInput = this.ref('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this._searchQuery = searchInput.value;
                this._debouncedSearch();
            });
        }

        this.$$('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = parseInt(item.dataset.bookId);
                if (bookId) {
                    this._selectBook(bookId);
                }
            });
        });

        const changeBookBtn = this.ref('changeBookBtn');
        if (changeBookBtn) {
            changeBookBtn.addEventListener('click', () => {
                this._clearBook();
            });
        }

        this.$$('.mode-btn').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                if (mode && mode !== inputMode) {
                    this._currentPage = '';
                    this._currentPercent = '';
                    this.setState({ inputMode: mode });
                }
            });
        });

        const pageInput = this.ref('pageInput');
        if (pageInput) {
            pageInput.addEventListener('input', () => {
                this._currentPage = pageInput.value;
                this._updatePreview();
                this._updateSaveButton();
            });
        }

        const percentInput = this.ref('percentInput');
        if (percentInput) {
            percentInput.addEventListener('input', () => {
                this._currentPercent = percentInput.value;
                this._updatePreview();
                this._updateSaveButton();
            });
        }

        const noteInput = this.ref('noteInput');
        if (noteInput) {
            noteInput.addEventListener('input', () => {
                this._note = noteInput.value;
            });
        }

        const finishedCheckbox = this.ref('finishedCheckbox');
        if (finishedCheckbox) {
            finishedCheckbox.addEventListener('change', () => {
                this._markFinished = finishedCheckbox.checked;
            });
        }

        const cancelBtn = this.ref('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.emit('cancel');
            });
        }

        const saveBtn = this.ref('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._handleSave());
        }

        this._updatePreview();
        this._updateSaveButton();
    }

    async onConnect() {
        const bookId = this.getAttribute('book-id');
        if (bookId) {
            await this._loadBook(parseInt(bookId));
        } else {
            this._loadSuggestions();
        }
    }

    onAttributeChange(name, oldValue, newValue) {
        if (name === 'book-id' && newValue && newValue !== oldValue) {
            this._loadBook(parseInt(newValue));
        }
    }

    async _loadSuggestions() {
        try {
            const data = await api.getBooks({ status: 'reading', perPage: 10 });
            this.setState({ suggestions: data.books || [] });
        } catch (error) {
            this.setState({ suggestions: [] });
        }
    }

    async _selectBook(bookId) {
        await this._loadBook(bookId);
    }

    _clearBook() {
        this._currentPage = '';
        this._currentPercent = '';
        this._note = '';
        this._markFinished = false;
        this._autoFinished = false;
        this._searchQuery = '';
        this.setState({ book: null, error: null, searchResults: [] });
        this._loadSuggestions();
    }

    async _loadBook(bookId) {
        this.setState({ loading: true, error: null });
        try {
            const book = await api.getBook(bookId);
            this._currentPage = '';
            this._currentPercent = '';
            this._note = '';
            this._markFinished = false;
            this._autoFinished = false;
            this.setState({ loading: false, book });
        } catch (error) {
            this.setState({ loading: false, error: 'Failed to load book.' });
        }
    }

    _debouncedSearch() {
        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout);
        }

        this._searchTimeout = setTimeout(() => {
            this._performSearch();
        }, 250);
    }

    async _performSearch() {
        const query = this._searchQuery.trim();
        if (query.length < 2) {
            this.setState({ searchResults: [], searching: false });
            return;
        }

        this.setState({ searching: true });
        try {
            const data = await api.getBooks({ search: query, perPage: 8 });
            this.setState({ searchResults: data.books || [], searching: false });
        } catch (error) {
            this.setState({ searchResults: [], searching: false });
        }
    }

    _calculatePreview() {
        const { book, inputMode } = this.state;
        if (!book) return null;

        const pageCount = book.page_count || 0;
        const currentPageInput = parseInt(this._currentPage);
        const currentPercentInput = parseInt(this._currentPercent);

        if (inputMode === 'page') {
            if (!currentPageInput) return null;
            const pageValue = pageCount ? Math.min(currentPageInput, pageCount) : currentPageInput;
            const percentValue = pageCount ? Math.min(100, Math.round((pageValue / pageCount) * 100)) : null;
            return { pageValue, percentValue };
        }

        if (Number.isNaN(currentPercentInput)) return null;
        const percentValue = Math.min(100, Math.max(0, currentPercentInput));
        const pageValue = pageCount ? Math.round((percentValue / 100) * pageCount) : null;
        return { pageValue, percentValue };
    }

    _updatePreview() {
        const preview = this._calculatePreview();
        const previewSection = this.ref('previewSection');
        const previewValue = this.ref('previewValue');
        const progressFill = this.ref('progressFill');
        const progressMeta = this.ref('progressMeta');
        const finishedCheckbox = this.ref('finishedCheckbox');

        if (!previewSection || !previewValue) return;

        if (!preview) {
            previewSection.style.display = 'none';
            if (progressFill) {
                progressFill.style.width = '0%';
            }
            return;
        }

        const { book } = this.state;
        const pageCount = book?.page_count || 0;
        const willFinish = (preview.percentValue !== null && preview.percentValue >= 100)
            || (pageCount && preview.pageValue >= pageCount);

        previewSection.style.display = '';

        if (preview.pageValue !== null && pageCount) {
            previewValue.textContent = `Page ${preview.pageValue} of ${pageCount} (${preview.percentValue || 0}%)`;
        } else if (preview.percentValue !== null) {
            previewValue.textContent = `${preview.percentValue}% complete`;
        } else {
            previewValue.textContent = `Page ${preview.pageValue}`;
        }

        if (progressFill) {
            const width = preview.percentValue !== null ? preview.percentValue : 0;
            progressFill.style.width = `${width}%`;
        }

        if (progressMeta) {
            if (preview.percentValue !== null) {
                const prevPercent = book?.progress_percent || 0;
                progressMeta.textContent = `${preview.percentValue}% • previously ${prevPercent}%`;
            } else if (preview.pageValue !== null && pageCount) {
                const prevPage = book?.current_page || 0;
                progressMeta.textContent = `Page ${preview.pageValue} of ${pageCount} • previously ${prevPage}`;
            } else {
                const prevPage = book?.current_page || 0;
                progressMeta.textContent = `Page ${preview.pageValue} • previously ${prevPage}`;
            }
        }

        this._autoFinished = willFinish;
        if (finishedCheckbox) {
            if (willFinish) {
                finishedCheckbox.checked = true;
                finishedCheckbox.disabled = true;
                this._markFinished = true;
            } else {
                finishedCheckbox.disabled = false;
            }
        }
    }

    _updateSaveButton() {
        const saveBtn = this.ref('saveBtn');
        if (!saveBtn) return;

        const { book, saving, inputMode } = this.state;
        let valid = false;

        if (book) {
            if (inputMode === 'page') {
                valid = parseInt(this._currentPage) > 0;
            } else {
                const value = parseInt(this._currentPercent);
                valid = !Number.isNaN(value) && value > 0;
            }
        }

        saveBtn.disabled = saving || !valid;
    }

    async _handleSave() {
        const { book, inputMode } = this.state;
        if (!book) {
            this.setState({ error: 'Select a book first.' });
            return;
        }

        const payload = {
            note: this._note.trim() || null,
            mark_finished: this._markFinished || this._autoFinished
        };

        if (inputMode === 'page') {
            const currentPage = parseInt(this._currentPage);
            if (!currentPage || currentPage <= 0) {
                this.setState({ error: 'Enter a valid current page.' });
                return;
            }
            payload.current_page = currentPage;
        } else {
            const currentPercent = parseInt(this._currentPercent);
            if (Number.isNaN(currentPercent) || currentPercent < 0) {
                this.setState({ error: 'Enter a valid percent.' });
                return;
            }
            payload.progress_percent = currentPercent;
        }

        this.setState({ saving: true, error: null });

        try {
            const result = await api.logProgress(book.book_id, payload);
            this._currentPage = '';
            this._currentPercent = '';
            this._note = '';
            this._markFinished = false;
            this._autoFinished = false;
            this.setState({ saving: false, book: result.book });
            this.emit('progress-logged', result);
        } catch (error) {
            this.setState({ saving: false, error: 'Failed to log update. Please try again.' });
        }
    }

    set book(book) {
        if (!book) return;
        this._currentPage = '';
        this._currentPercent = '';
        this._note = '';
        this._markFinished = false;
        this._autoFinished = false;
        this.setState({ book, error: null });
    }
}

defineComponent('bt-log-update', BtLogUpdate);
