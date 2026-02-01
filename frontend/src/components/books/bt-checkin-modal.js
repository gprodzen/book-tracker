/**
 * bt-checkin-modal - Modal for logging reading progress
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtCheckinModal extends BaseComponent {
    constructor() {
        super();
        // Local input values - NOT in state to avoid re-render on keystroke
        this._pagesRead = '';
        this._notes = '';
        this._markFinished = false;

        this.setState({
            book: null,
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
        const { book, saving, error } = this.state;

        if (!book) {
            return '<div>Loading...</div>';
        }

        const currentPage = book.current_page || 0;
        const pageCount = book.page_count || 0;
        const currentProgress = book.progress_percent || 0;

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
                            value="${this._pagesRead}"
                            min="1"
                            max="${pageCount ? pageCount - currentPage : 9999}"
                            placeholder="0"
                            autofocus
                        >
                        <span class="pages-suffix">${pageCount ? `of ${pageCount - currentPage} remaining` : 'pages'}</span>
                    </div>
                </div>

                <div class="preview" ref="previewSection" style="display: none;">
                    <div class="preview-label">After this check-in:</div>
                    <div class="preview-value" ref="previewValue"></div>
                </div>

                <div class="form-group">
                    <label for="notes">Notes (optional)</label>
                    <textarea
                        id="notes"
                        ref="notesInput"
                        placeholder="What did you learn or find interesting?"
                    >${this._notes}</textarea>
                </div>

                <div class="checkbox-group" ref="finishedCheckboxGroup" style="${pageCount ? '' : 'display: none;'}">
                    <input type="checkbox" id="mark-finished" ref="finishedCheckbox" ${this._markFinished ? 'checked' : ''}>
                    <label for="mark-finished">Mark book as finished</label>
                </div>

                <div class="form-actions">
                    <button type="button" class="secondary" ref="cancelBtn" ${saving ? 'disabled' : ''}>
                        Cancel
                    </button>
                    <button type="button" class="primary" ref="saveBtn" disabled>
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
            // Use local variable + direct DOM updates instead of setState to avoid re-render
            pagesInput.addEventListener('input', () => {
                this._pagesRead = pagesInput.value;
                this._updatePreview();
                this._updateSaveButton();
            });
            // Initialize preview on mount if there's already a value
            this._updatePreview();
            this._updateSaveButton();
        }

        if (notesInput) {
            // Store notes locally, no need to re-render
            notesInput.addEventListener('input', () => {
                this._notes = notesInput.value;
            });
        }

        if (finishedCheckbox) {
            finishedCheckbox.addEventListener('change', () => {
                this._markFinished = finishedCheckbox.checked;
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

    /**
     * Update the preview section without full re-render
     */
    _updatePreview() {
        const { book } = this.state;
        if (!book) return;

        const currentPage = book.current_page || 0;
        const pageCount = book.page_count || 0;
        const pagesReadNum = parseInt(this._pagesRead) || 0;

        const previewSection = this.ref('previewSection');
        const previewValue = this.ref('previewValue');
        const finishedCheckboxGroup = this.ref('finishedCheckboxGroup');

        if (!previewSection || !previewValue) return;

        if (pagesReadNum > 0) {
            const newPage = Math.min(currentPage + pagesReadNum, pageCount || currentPage + pagesReadNum);
            const newProgress = pageCount ? Math.min(100, Math.round((newPage / pageCount) * 100)) : 0;
            const willFinish = pageCount && newPage >= pageCount;

            previewSection.style.display = '';
            previewValue.textContent = `Page ${newPage}${pageCount ? ` of ${pageCount}` : ''} (${newProgress}%)${willFinish ? ' - Complete!' : ''}`;

            // Hide checkbox if book will be finished
            if (finishedCheckboxGroup) {
                finishedCheckboxGroup.style.display = willFinish ? 'none' : '';
            }
        } else {
            previewSection.style.display = 'none';
            if (finishedCheckboxGroup && pageCount) {
                finishedCheckboxGroup.style.display = '';
            }
        }
    }

    /**
     * Update save button enabled state without full re-render
     */
    _updateSaveButton() {
        const saveBtn = this.ref('saveBtn');
        if (!saveBtn) return;

        const pagesReadNum = parseInt(this._pagesRead) || 0;
        const { saving } = this.state;

        saveBtn.disabled = saving || !pagesReadNum;
    }

    async _handleSave() {
        const { book } = this.state;
        // Read values from local variables (not state)
        const pagesReadNum = parseInt(this._pagesRead) || 0;
        const notes = this._notes;
        const markFinished = this._markFinished;

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
        // Reset local input values when book changes
        this._pagesRead = '';
        this._notes = '';
        this._markFinished = false;
        this.setState({ book, saving: false, error: null });
    }
}

defineComponent('bt-checkin-modal', BtCheckinModal);
