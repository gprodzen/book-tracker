/**
 * bt-checkin-modal - Modal for logging reading progress
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtCheckinModal extends BaseComponent {
    constructor() {
        super();
        this.setState({
            book: null,
            pagesRead: '',
            notes: '',
            markFinished: false,
            saving: false,
            error: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .checkin-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .current-progress {
                background: var(--bg-secondary, #F5F0E8);
                padding: 16px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .progress-label {
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            .progress-value {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text, #2C2416);
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            label {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text, #2C2416);
            }

            .hint {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            input[type="number"],
            textarea {
                padding: 10px 14px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                color: var(--text, #2C2416);
                font-size: 1rem;
                font-family: inherit;
            }

            input[type="number"]:focus,
            textarea:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            textarea {
                min-height: 80px;
                resize: vertical;
            }

            .pages-input-group {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .pages-input-group input {
                width: 120px;
            }

            .pages-suffix {
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
            }

            .preview {
                background: var(--bg-tertiary, #EDE6DB);
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
            }

            .preview-label {
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 4px;
            }

            .preview-value {
                font-weight: 600;
                color: var(--accent, #8B4513);
            }

            .checkbox-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .checkbox-group input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }

            .checkbox-group label {
                cursor: pointer;
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 8px;
            }

            button {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: background var(--duration-fast, 150ms) var(--ease-out);
            }

            button.secondary {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
            }

            button.secondary:hover:not(:disabled) {
                background: var(--bg-tertiary, #EDE6DB);
            }

            button.primary {
                background: var(--accent, #8B4513);
                border: 1px solid var(--accent, #8B4513);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #A0522D);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .error {
                color: var(--color-error, #dc2626);
                font-size: 0.875rem;
                padding: 8px 12px;
                background: rgba(220, 38, 38, 0.1);
                border-radius: 6px;
            }
        `;
    }

    template() {
        const { book, pagesRead, notes, markFinished, saving, error } = this.state;

        if (!book) {
            return '<div>Loading...</div>';
        }

        const currentPage = book.current_page || 0;
        const pageCount = book.page_count || 0;
        const pagesReadNum = parseInt(pagesRead) || 0;
        const newPage = Math.min(currentPage + pagesReadNum, pageCount || currentPage + pagesReadNum);
        const newProgress = pageCount ? Math.min(100, Math.round((newPage / pageCount) * 100)) : 0;
        const currentProgress = book.progress_percent || 0;

        const willFinish = pageCount && newPage >= pageCount;

        return `
            <div class="checkin-form">
                <div class="current-progress">
                    <div>
                        <div class="progress-label">Current Progress</div>
                        <div class="progress-value">${currentPage} / ${pageCount || '?'} pages (${currentProgress}%)</div>
                    </div>
                </div>

                ${error ? `<div class="error">${this.escapeHtml(error)}</div>` : ''}

                <div class="form-group">
                    <label for="pages-read">Pages read this session</label>
                    <div class="pages-input-group">
                        <input
                            type="number"
                            id="pages-read"
                            ref="pagesInput"
                            value="${pagesRead}"
                            min="1"
                            max="${pageCount ? pageCount - currentPage : 9999}"
                            placeholder="0"
                            autofocus
                        >
                        <span class="pages-suffix">${pageCount ? `of ${pageCount - currentPage} remaining` : 'pages'}</span>
                    </div>
                </div>

                ${pagesReadNum > 0 ? `
                    <div class="preview">
                        <div class="preview-label">After this check-in:</div>
                        <div class="preview-value">
                            Page ${newPage}${pageCount ? ` of ${pageCount}` : ''} (${newProgress}%)
                            ${willFinish ? ' - Complete!' : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="form-group">
                    <label for="notes">Notes (optional)</label>
                    <textarea
                        id="notes"
                        ref="notesInput"
                        placeholder="What did you learn or find interesting?"
                    >${notes}</textarea>
                </div>

                ${!willFinish && pageCount ? `
                    <div class="checkbox-group">
                        <input type="checkbox" id="mark-finished" ref="finishedCheckbox" ${markFinished ? 'checked' : ''}>
                        <label for="mark-finished">Mark book as finished</label>
                    </div>
                ` : ''}

                <div class="form-actions">
                    <button type="button" class="secondary" ref="cancelBtn" ${saving ? 'disabled' : ''}>
                        Cancel
                    </button>
                    <button type="button" class="primary" ref="saveBtn" ${saving || !pagesReadNum ? 'disabled' : ''}>
                        ${saving ? 'Saving...' : 'Log Progress'}
                    </button>
                </div>
            </div>
        `;
    }

    afterRender() {
        const pagesInput = this.ref('pagesInput');
        const notesInput = this.ref('notesInput');
        const finishedCheckbox = this.ref('finishedCheckbox');
        const cancelBtn = this.ref('cancelBtn');
        const saveBtn = this.ref('saveBtn');

        if (pagesInput) {
            pagesInput.addEventListener('input', () => {
                this.setState({ pagesRead: pagesInput.value });
            });
        }

        if (notesInput) {
            notesInput.addEventListener('input', () => {
                this.setState({ notes: notesInput.value });
            });
        }

        if (finishedCheckbox) {
            finishedCheckbox.addEventListener('change', () => {
                this.setState({ markFinished: finishedCheckbox.checked });
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.emit('cancel');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._handleSave());
        }
    }

    async _handleSave() {
        const { book, pagesRead, notes, markFinished } = this.state;
        const pagesReadNum = parseInt(pagesRead) || 0;

        if (pagesReadNum <= 0) {
            this.setState({ error: 'Please enter pages read' });
            return;
        }

        this.setState({ saving: true, error: null });

        try {
            const result = await api.createSession(book.book_id, {
                pages_read: pagesReadNum,
                notes: notes.trim() || null,
                mark_finished: markFinished
            });

            this.emit('checkin-complete', {
                session: result.session,
                book: result.book
            });
        } catch (error) {
            console.error('Error creating session:', error);
            this.setState({
                saving: false,
                error: 'Failed to log progress. Please try again.'
            });
        }
    }

    /**
     * Set the book data
     */
    set book(book) {
        this.setState({ book });
    }
}

defineComponent('bt-checkin-modal', BtCheckinModal);
