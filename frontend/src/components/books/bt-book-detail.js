/**
 * bt-book-detail - Full book detail modal content
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';
import '../shared/bt-loading.js';
import '../shared/bt-book-cover.js';
import '../shared/bt-progress-bar.js';
import '../shared/bt-status-badge.js';

export class BtBookDetail extends BaseComponent {
    static get observedAttributes() {
        return ['book-id'];
    }

    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            book: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .book-detail {
                display: grid;
                grid-template-columns: 200px 1fr;
                gap: 24px;
            }

            .cover-section {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            bt-book-cover {
                border-radius: 8px;
                overflow: hidden;
            }

            .info-section h2 {
                font-size: 1.25rem;
                margin-bottom: 8px;
                color: var(--text, #2C2416);
            }

            .author {
                color: var(--accent, #8B4513);
                margin-bottom: 16px;
            }

            .detail-row {
                display: flex;
                gap: 24px;
                margin-bottom: 12px;
                font-size: 0.875rem;
            }

            .detail-label {
                color: var(--text-muted, #8B7E6A);
                min-width: 100px;
            }

            select {
                padding: 6px 12px;
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

            .book-rating {
                color: var(--yellow, #B8860B);
            }

            .path-tag {
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 4px;
                background: var(--bg-tertiary, #EDE6DB);
                margin-right: 6px;
            }

            .tags-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .tag {
                background: var(--bg-tertiary, #EDE6DB);
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.75rem;
            }

            .description {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid var(--border, #D4C9B8);
                font-size: 0.875rem;
                line-height: 1.7;
                color: var(--text-muted, #8B7E6A);
            }

            .section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid var(--border, #D4C9B8);
            }

            .section h3, .section h4 {
                margin-bottom: 12px;
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            /* Progress update */
            .progress-inputs {
                display: flex;
                gap: 12px;
                align-items: flex-end;
            }

            .progress-input-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .progress-input-group label {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            .progress-input-group input {
                width: 100px;
                padding: 8px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                color: var(--text, #2C2416);
                font-size: 0.875rem;
            }

            .progress-input-group input:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            /* Format ownership */
            .format-checkbox {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-right: 16px;
                cursor: pointer;
                font-size: 0.875rem;
            }

            .format-checkbox input {
                cursor: pointer;
            }

            /* Source link */
            .source-link {
                color: var(--accent, #8B4513);
                text-decoration: none;
                cursor: pointer;
            }

            .source-link:hover {
                text-decoration: underline;
            }

            /* Sparked books */
            .sparked-books ul {
                list-style: none;
                padding: 0;
            }

            .sparked-books li {
                padding: 8px 0;
                border-bottom: 1px solid var(--border, #D4C9B8);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .sparked-books li:last-child {
                border-bottom: none;
            }

            .sparked-books a {
                color: var(--text, #2C2416);
                text-decoration: none;
                cursor: pointer;
            }

            .sparked-books a:hover {
                color: var(--accent, #8B4513);
            }

            /* Actions */
            .actions {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid var(--border, #D4C9B8);
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

            @media (max-width: 768px) {
                .book-detail {
                    grid-template-columns: 1fr;
                }

                .cover-section {
                    max-width: 150px;
                    margin: 0 auto;
                }

                .detail-row {
                    flex-direction: column;
                    gap: 4px;
                }

                .detail-label {
                    min-width: auto;
                }

                .progress-inputs {
                    flex-direction: column;
                    align-items: stretch;
                }

                .progress-input-group input {
                    width: 100%;
                }

                .format-checkbox {
                    display: flex;
                    padding: 8px 0;
                    margin-right: 0;
                }
            }
        `;
    }

    template() {
        const { loading, error, book } = this.state;

        if (loading) {
            return '<bt-loading text="Loading book details..."></bt-loading>';
        }

        if (error) {
            return `<div class="error">${this.escapeHtml(error)}</div>`;
        }

        if (!book) {
            return '<bt-loading text="Loading book details..."></bt-loading>';
        }

        return this._renderBookDetail(book);
    }

    _renderBookDetail(book) {
        const pathsHtml = book.paths && book.paths.length
            ? `<div class="detail-row">
                   <span class="detail-label">Learning Paths</span>
                   <span>${book.paths.map(p => `<span class="path-tag" style="border-left: 2px solid ${p.color}">${this.escapeHtml(p.name)}</span>`).join('')}</span>
               </div>`
            : '';

        const tagsHtml = book.tags && book.tags.length
            ? `<div class="tags-list">${book.tags.map(t => `<span class="tag">${this.escapeHtml(t.name)}</span>`).join('')}</div>`
            : '';

        const sourceBookHtml = book.source_book
            ? `<div class="detail-row">
                   <span class="detail-label">Sparked from</span>
                   <span><a class="source-link" data-book-id="${book.source_book.book_id}">${this.escapeHtml(book.source_book.title)}</a> by ${this.escapeHtml(book.source_book.author)}</span>
               </div>`
            : '';

        const sparkedBooksHtml = book.sparked_books && book.sparked_books.length
            ? `<div class="section sparked-books">
                   <h4>Books sparked from this:</h4>
                   <ul>
                       ${book.sparked_books.map(b =>
                           `<li>
                               <a data-book-id="${b.book_id}">${this.escapeHtml(b.title)}</a>
                               <bt-status-badge status="${b.status}"></bt-status-badge>
                           </li>`
                       ).join('')}
                   </ul>
               </div>`
            : '';

        const ideaSourceHtml = book.idea_source
            ? `<div class="detail-row">
                   <span class="detail-label">Idea source</span>
                   <span>${this.escapeHtml(book.idea_source)}</span>
               </div>`
            : '';

        const formatHtml = `
            <div class="section">
                <h4>Format Ownership</h4>
                <label class="format-checkbox">
                    <input type="checkbox" data-field="owns_kindle" ${book.owns_kindle ? 'checked' : ''}>
                    <span>Kindle</span>
                </label>
                <label class="format-checkbox">
                    <input type="checkbox" data-field="owns_audible" ${book.owns_audible ? 'checked' : ''}>
                    <span>Audible</span>
                </label>
                <label class="format-checkbox">
                    <input type="checkbox" data-field="owns_hardcopy" ${book.owns_hardcopy ? 'checked' : ''}>
                    <span>Physical</span>
                </label>
            </div>
        `;

        const progressSection = book.status === 'reading' ? `
            <div class="section">
                <h3>Update Progress</h3>
                <div class="progress-inputs">
                    <div class="progress-input-group">
                        <label>Current Page</label>
                        <input type="number" ref="progressInput" value="${book.current_page || 0}" min="0" max="${book.page_count || 9999}">
                    </div>
                    <div class="progress-input-group">
                        <label>of ${book.page_count || '?'} pages</label>
                    </div>
                    <button class="primary" ref="saveProgressBtn">Save</button>
                </div>
            </div>
        ` : '';

        return `
            <div class="book-detail">
                <div class="cover-section">
                    <bt-book-cover
                        src="${book.cover_image_url || ''}"
                        title="${this.escapeHtml(book.title)}"
                        size="large"
                    ></bt-book-cover>
                </div>
                <div class="info-section">
                    <h2>${this.escapeHtml(book.title)}</h2>
                    <div class="author">${this.escapeHtml(book.author)}${book.additional_authors ? `, ${this.escapeHtml(book.additional_authors)}` : ''}</div>

                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <select ref="statusSelect">
                            ${['want_to_read', 'queued', 'reading', 'finished', 'abandoned'].map(s =>
                                `<option value="${s}" ${book.status === s ? 'selected' : ''}>${this.formatStatus(s)}</option>`
                            ).join('')}
                        </select>
                    </div>

                    ${book.status === 'reading' ? `
                        <div class="detail-row">
                            <span class="detail-label">Progress</span>
                            <span>${book.progress_percent || 0}%</span>
                        </div>
                    ` : ''}

                    ${book.my_rating ? `
                        <div class="detail-row">
                            <span class="detail-label">My Rating</span>
                            <span class="book-rating">${this.renderStars(book.my_rating)}</span>
                        </div>
                    ` : ''}

                    ${book.page_count ? `
                        <div class="detail-row">
                            <span class="detail-label">Pages</span>
                            <span>${book.page_count}</span>
                        </div>
                    ` : ''}

                    ${book.year_published ? `
                        <div class="detail-row">
                            <span class="detail-label">Published</span>
                            <span>${book.year_published}</span>
                        </div>
                    ` : ''}

                    ${book.why_reading ? `
                        <div class="detail-row">
                            <span class="detail-label">Why Reading</span>
                            <span>${this.escapeHtml(book.why_reading)}</span>
                        </div>
                    ` : ''}

                    ${sourceBookHtml}
                    ${ideaSourceHtml}
                    ${pathsHtml}
                    ${tagsHtml}

                    ${formatHtml}

                    ${book.description ? `
                        <div class="description">${this.escapeHtml(book.description)}</div>
                    ` : ''}

                    ${progressSection}

                    ${sparkedBooksHtml}

                    <div class="actions">
                        <button ref="addSparkBtn">+ Add book sparked from this</button>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        const { book } = this.state;
        if (!book) return;

        // Status change
        const statusSelect = this.ref('statusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', async () => {
                await this._updateBook({ status: statusSelect.value });
            });
        }

        // Format checkboxes
        this.$$('input[data-field]').forEach(checkbox => {
            checkbox.addEventListener('change', async () => {
                await this._updateBook({ [checkbox.dataset.field]: checkbox.checked });
            });
        });

        // Progress save
        const saveProgressBtn = this.ref('saveProgressBtn');
        const progressInput = this.ref('progressInput');
        if (saveProgressBtn && progressInput) {
            saveProgressBtn.addEventListener('click', async () => {
                await this._updateBook({ current_page: parseInt(progressInput.value, 10) });
            });
        }

        // Add sparked book
        const addSparkBtn = this.ref('addSparkBtn');
        if (addSparkBtn) {
            addSparkBtn.addEventListener('click', () => {
                this.emit('add-sparked-book', { sourceBookId: book.book_id });
            });
        }

        // Source book links
        this.$$('.source-link, .sparked-books a').forEach(link => {
            link.addEventListener('click', () => {
                const bookId = parseInt(link.dataset.bookId);
                this.emit('show-book', { bookId });
            });
        });
    }

    async _updateBook(data) {
        const { book } = this.state;
        if (!book) return;

        try {
            await api.updateBook(book.book_id, data);
            await this._loadBook(book.book_id);
            this.emit('book-updated', { bookId: book.book_id });
        } catch (error) {
            console.error('Error updating book:', error);
            this.emit('toast', { message: 'Failed to update book', type: 'error' });
        }
    }

    onAttributeChange(name, oldValue, newValue) {
        if (name === 'book-id' && newValue) {
            this._loadBook(parseInt(newValue));
        }
    }

    async _loadBook(bookId) {
        this.setState({ loading: true, error: null });

        try {
            const book = await api.getBook(bookId);
            this.setState({ loading: false, book });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load book details'
            });
            console.error('Book detail error:', error);
        }
    }

    /**
     * Set book data directly
     */
    set book(book) {
        this.setState({ loading: false, book });
    }

    /**
     * Refresh the book data
     */
    async refresh() {
        const { book } = this.state;
        if (book) {
            await this._loadBook(book.book_id);
        }
    }
}

defineComponent('bt-book-detail', BtBookDetail);
