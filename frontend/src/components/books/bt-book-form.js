/**
 * bt-book-form - Add/edit book form with Open Library search
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';
import '../shared/bt-loading.js';
import '../shared/bt-book-cover.js';

export class BtBookForm extends BaseComponent {
    static get observedAttributes() {
        return ['source-book-id'];
    }

    constructor() {
        super();
        this.setState({
            mode: 'search', // 'search', 'confirm', 'manual'
            searchQuery: '',
            searchResults: [],
            searching: false,
            selectedBook: null,
            submitting: false,
            error: null
        });

        this._debouncedSearch = this.debounce(this._handleSearch.bind(this), 500);
    }

    styles() {
        return `
            :host {
                display: block;
                min-height: 300px;
            }

            .tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--border, #D4C9B8);
                padding-bottom: 12px;
            }

            .tab-btn {
                background: transparent;
                border: none;
                padding: 8px 16px;
                color: var(--text-muted, #8B7E6A);
                cursor: pointer;
                border-radius: 6px;
                font-size: 0.875rem;
            }

            .tab-btn:hover {
                color: var(--text, #2C2416);
            }

            .tab-btn.active {
                background: var(--bg-tertiary, #EDE6DB);
                color: var(--text, #2C2416);
            }

            .form-group {
                margin-bottom: 16px;
            }

            .form-group label {
                display: block;
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 6px;
            }

            input, select, textarea {
                width: 100%;
                padding: 8px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                color: var(--text, #2C2416);
                font-size: 0.875rem;
                font-family: inherit;
            }

            input:focus, select:focus, textarea:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            textarea {
                min-height: 80px;
                resize: vertical;
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 20px;
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

            /* Search results */
            .search-results {
                max-height: 400px;
                overflow-y: auto;
            }

            .search-result-item {
                display: flex;
                gap: 12px;
                padding: 12px;
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: border-color 0.2s;
            }

            .search-result-item:hover {
                border-color: var(--accent, #8B4513);
            }

            .search-result-cover {
                width: 60px;
                height: 90px;
                flex-shrink: 0;
                border-radius: 4px;
                overflow: hidden;
            }

            .search-result-info {
                flex: 1;
            }

            .search-result-title {
                font-weight: 600;
                font-size: 0.9rem;
                margin-bottom: 4px;
            }

            .search-result-author {
                font-size: 0.8rem;
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 4px;
            }

            .search-result-year,
            .search-result-pages {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            /* Confirm book */
            .confirm-book-info {
                display: flex;
                gap: 16px;
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--border, #D4C9B8);
            }

            .confirm-cover {
                width: 100px;
                height: 150px;
                flex-shrink: 0;
                border-radius: 6px;
                overflow: hidden;
            }

            .confirm-details h3 {
                margin-bottom: 8px;
            }

            .confirm-details .author {
                color: var(--accent, #8B4513);
                margin-bottom: 8px;
            }

            .confirm-details p {
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            .source-book-note {
                font-size: 0.8rem;
                color: var(--accent, #8B4513);
                background: rgba(139, 69, 19, 0.1);
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 12px;
            }

            .error-message {
                color: var(--red, #A0522D);
                font-size: 0.875rem;
                margin-bottom: 12px;
                padding: 8px;
                background: rgba(160, 82, 45, 0.1);
                border-radius: 6px;
            }

            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--text-muted, #8B7E6A);
            }
        `;
    }

    template() {
        const { mode } = this.state;

        return `
            <div class="book-form">
                ${mode !== 'confirm' ? `
                    <div class="tabs">
                        <button class="tab-btn ${mode === 'search' ? 'active' : ''}" data-mode="search">Search Open Library</button>
                        <button class="tab-btn ${mode === 'manual' ? 'active' : ''}" data-mode="manual">Manual Entry</button>
                    </div>
                ` : ''}

                ${mode === 'search' ? this._renderSearchMode() : ''}
                ${mode === 'confirm' ? this._renderConfirmMode() : ''}
                ${mode === 'manual' ? this._renderManualMode() : ''}
            </div>
        `;
    }

    _renderSearchMode() {
        const { searchQuery, searchResults, searching, error } = this.state;

        return `
            <div class="search-mode">
                <div class="form-group">
                    <label>Search for a book</label>
                    <input type="text" ref="searchInput" placeholder="Title, author, or ISBN..." value="${this.escapeHtml(searchQuery)}">
                </div>

                ${error ? `<div class="error-message">${this.escapeHtml(error)}</div>` : ''}

                <div class="search-results" ref="searchResults">
                    ${searching ? '<bt-loading text="Searching..."></bt-loading>' : ''}
                    ${!searching && searchQuery.length >= 2 && searchResults.length === 0 ? `
                        <div class="empty-state">No books found. Try a different search or add manually.</div>
                    ` : ''}
                    ${!searching ? searchResults.map(book => this._renderSearchResult(book)).join('') : ''}
                </div>
            </div>
        `;
    }

    _renderSearchResult(book) {
        return `
            <div class="search-result-item" data-book='${JSON.stringify(book).replace(/'/g, '&#39;')}'>
                <div class="search-result-cover">
                    <bt-book-cover
                        src="${book.cover_image_medium || book.cover_image_url || ''}"
                        title="${this.escapeHtml(book.title)}"
                        size="small"
                    ></bt-book-cover>
                </div>
                <div class="search-result-info">
                    <div class="search-result-title">${this.escapeHtml(book.title)}</div>
                    <div class="search-result-author">${this.escapeHtml(book.authors ? book.authors.join(', ') : 'Unknown')}</div>
                    ${book.first_publish_year ? `<div class="search-result-year">${book.first_publish_year}</div>` : ''}
                    ${book.page_count ? `<div class="search-result-pages">${book.page_count} pages</div>` : ''}
                </div>
            </div>
        `;
    }

    _renderConfirmMode() {
        const { selectedBook, submitting, error } = this.state;
        const sourceBookId = this.getAttribute('source-book-id');

        if (!selectedBook) return '';

        return `
            <div class="confirm-mode">
                <div class="confirm-book-info">
                    <div class="confirm-cover">
                        <bt-book-cover
                            src="${selectedBook.cover_image_url || ''}"
                            title="${this.escapeHtml(selectedBook.title)}"
                        ></bt-book-cover>
                    </div>
                    <div class="confirm-details">
                        <h3>${this.escapeHtml(selectedBook.title)}</h3>
                        <p class="author">${this.escapeHtml(selectedBook.authors ? selectedBook.authors.join(', ') : 'Unknown')}</p>
                        ${selectedBook.first_publish_year ? `<p>Published: ${selectedBook.first_publish_year}</p>` : ''}
                        ${selectedBook.page_count ? `<p>${selectedBook.page_count} pages</p>` : ''}
                    </div>
                </div>

                ${error ? `<div class="error-message">${this.escapeHtml(error)}</div>` : ''}

                <form ref="confirmForm">
                    <div class="form-group">
                        <label>Initial Status</label>
                        <select ref="confirmStatus">
                            <option value="interested">Interested</option>
                            <option value="owned">Owned</option>
                            <option value="queued">Queued</option>
                            <option value="reading">Reading</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Idea Source</label>
                        <textarea ref="confirmIdeaSource" placeholder="Where did you hear about this book?"></textarea>
                    </div>
                    ${sourceBookId ? `<p class="source-book-note">This book will be linked as sparked from the previous book.</p>` : ''}
                    <div class="form-actions">
                        <button type="button" ref="backBtn">Back</button>
                        <button type="submit" class="primary" ${submitting ? 'disabled' : ''}>${submitting ? 'Adding...' : 'Add to Library'}</button>
                    </div>
                </form>
            </div>
        `;
    }

    _renderManualMode() {
        const { submitting, error } = this.state;
        const sourceBookId = this.getAttribute('source-book-id');

        return `
            <div class="manual-mode">
                ${error ? `<div class="error-message">${this.escapeHtml(error)}</div>` : ''}

                <form ref="manualForm">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" ref="manualTitle" required>
                    </div>
                    <div class="form-group">
                        <label>Author *</label>
                        <input type="text" ref="manualAuthor" required>
                    </div>
                    <div class="form-group">
                        <label>ISBN</label>
                        <input type="text" ref="manualIsbn">
                    </div>
                    <div class="form-group">
                        <label>Page Count</label>
                        <input type="number" ref="manualPages" min="1">
                    </div>
                    <div class="form-group">
                        <label>Year Published</label>
                        <input type="number" ref="manualYear" min="1000" max="2100">
                    </div>
                    <div class="form-group">
                        <label>Initial Status</label>
                        <select ref="manualStatus">
                            <option value="interested">Interested</option>
                            <option value="owned">Owned</option>
                            <option value="queued">Queued</option>
                            <option value="reading">Reading</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Idea Source</label>
                        <textarea ref="manualIdeaSource" placeholder="Where did you hear about this book?"></textarea>
                    </div>
                    ${sourceBookId ? `<p class="source-book-note">This book will be linked as sparked from the previous book.</p>` : ''}
                    <div class="form-actions">
                        <button type="button" ref="cancelBtn">Cancel</button>
                        <button type="submit" class="primary" ${submitting ? 'disabled' : ''}>${submitting ? 'Adding...' : 'Add Book'}</button>
                    </div>
                </form>
            </div>
        `;
    }

    afterRender() {
        const { mode } = this.state;

        // Tab buttons
        this.$$('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ mode: btn.dataset.mode, error: null });
            });
        });

        if (mode === 'search') {
            // Search input
            const searchInput = this.ref('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    this.setState({ searchQuery: searchInput.value });
                    this._debouncedSearch(searchInput.value);
                });
                setTimeout(() => searchInput.focus(), 0);
            }

            // Search results
            this.$$('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const book = JSON.parse(item.dataset.book);
                    this.setState({ selectedBook: book, mode: 'confirm', error: null });
                });
            });
        }

        if (mode === 'confirm') {
            // Back button
            const backBtn = this.ref('backBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.setState({ mode: 'search', selectedBook: null, error: null });
                });
            }

            // Confirm form
            const confirmForm = this.ref('confirmForm');
            if (confirmForm) {
                confirmForm.addEventListener('submit', (e) => this._handleConfirmSubmit(e));
            }
        }

        if (mode === 'manual') {
            // Cancel button
            const cancelBtn = this.ref('cancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.emit('cancel');
                });
            }

            // Manual form
            const manualForm = this.ref('manualForm');
            if (manualForm) {
                manualForm.addEventListener('submit', (e) => this._handleManualSubmit(e));
            }

            // Focus title input
            const titleInput = this.ref('manualTitle');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 0);
            }
        }
    }

    async _handleSearch(query) {
        if (query.length < 2) {
            this.setState({ searchResults: [], searching: false });
            return;
        }

        this.setState({ searching: true, error: null });

        try {
            const data = await api.searchOpenLibrary(query);
            this.setState({ searchResults: data.results, searching: false });
        } catch (error) {
            this.setState({
                searchResults: [],
                searching: false,
                error: 'Error searching. Please try again.'
            });
            console.error('Search error:', error);
        }
    }

    async _handleConfirmSubmit(e) {
        e.preventDefault();

        const { selectedBook } = this.state;
        const sourceBookId = this.getAttribute('source-book-id');

        const bookData = {
            title: selectedBook.title,
            author: selectedBook.authors ? selectedBook.authors[0] : 'Unknown',
            additional_authors: selectedBook.authors ? selectedBook.authors.slice(1).join(', ') : null,
            isbn: selectedBook.isbn_10 || null,
            isbn13: selectedBook.isbn_13 || null,
            page_count: selectedBook.page_count || null,
            year_published: selectedBook.first_publish_year || null,
            cover_image_url: selectedBook.cover_image_url || null,
            open_library_key: selectedBook.open_library_key || null,
            status: this.ref('confirmStatus').value,
            idea_source: this.ref('confirmIdeaSource').value || null,
            source_book_id: sourceBookId ? parseInt(sourceBookId) : null
        };

        await this._createBook(bookData);
    }

    async _handleManualSubmit(e) {
        e.preventDefault();

        const sourceBookId = this.getAttribute('source-book-id');

        const bookData = {
            title: this.ref('manualTitle').value,
            author: this.ref('manualAuthor').value,
            isbn: this.ref('manualIsbn').value || null,
            page_count: parseInt(this.ref('manualPages').value) || null,
            year_published: parseInt(this.ref('manualYear').value) || null,
            status: this.ref('manualStatus').value,
            idea_source: this.ref('manualIdeaSource').value || null,
            source_book_id: sourceBookId ? parseInt(sourceBookId) : null
        };

        await this._createBook(bookData);
    }

    async _createBook(bookData) {
        this.setState({ submitting: true, error: null });

        try {
            const result = await api.createBook(bookData);
            this.emit('book-created', { book: result });
        } catch (error) {
            let errorMessage = 'Error adding book. Please try again.';
            if (error.message.includes('409')) {
                errorMessage = 'This book is already in your library.';
            }
            this.setState({ submitting: false, error: errorMessage });
            console.error('Error adding book:', error);
        }
    }

    /**
     * Reset the form
     */
    reset() {
        this.setState({
            mode: 'search',
            searchQuery: '',
            searchResults: [],
            searching: false,
            selectedBook: null,
            submitting: false,
            error: null
        });
    }
}

defineComponent('bt-book-form', BtBookForm);
