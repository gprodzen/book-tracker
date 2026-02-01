/**
 * bt-reading-card - Currently reading card with progress update
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';
import '../shared/bt-book-cover.js';
import '../shared/bt-progress-bar.js';

export class BtReadingCard extends BaseComponent {
    constructor() {
        super();
        this._book = null;
    }

    set book(book) {
        this._book = book;
        if (this._connected) {
            this.render();
        }
    }

    get book() {
        return this._book;
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .reading-card {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .reading-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(44, 36, 22, 0.1);
            }

            bt-book-cover {
                height: 180px;
            }

            .info {
                padding: 10px;
            }

            .title {
                font-size: 0.8rem;
                font-weight: 600;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                margin-bottom: 4px;
            }

            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.7rem;
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 6px;
            }

            .stale-indicator {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(160, 82, 45, 0.15);
                color: var(--red, #A0522D);
            }

            .path-badge {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: var(--bg-tertiary, #EDE6DB);
                color: var(--text-muted, #8B7E6A);
                margin-top: 6px;
                display: inline-block;
            }

            /* Quick progress update */
            .quick-progress {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid var(--border, #D4C9B8);
            }

            .quick-progress-form {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .quick-progress input {
                width: 60px;
                padding: 4px 8px;
                font-size: 0.75rem;
                background: var(--bg-tertiary, #EDE6DB);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 4px;
                color: var(--text, #2C2416);
            }

            .quick-progress input:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            .quick-progress span {
                font-size: 0.7rem;
                color: var(--text-muted, #8B7E6A);
            }

            .quick-progress button {
                padding: 4px 8px;
                font-size: 0.7rem;
                background: var(--accent, #8B4513);
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
            }

            .quick-progress button:hover {
                background: var(--accent-hover, #A0522D);
            }

            .quick-progress button:disabled {
                opacity: 0.5;
            }

            @media (max-width: 768px) {
                bt-book-cover {
                    height: 160px;
                }
            }
        `;
    }

    template() {
        if (!this._book) {
            return '<bt-loading type="skeleton-card"></bt-loading>';
        }

        const book = this._book;
        const progress = book.progress_percent || 0;
        const isStale = book.is_stale === 1;

        const pathBadge = book.paths && book.paths.length > 0
            ? `<span class="path-badge" style="border-left: 2px solid ${book.paths[0].color}">${this.escapeHtml(book.paths[0].name)}</span>`
            : '';

        return `
            <div class="reading-card" data-book-id="${book.book_id}">
                <bt-book-cover
                    src="${book.cover_image_url || ''}"
                    title="${this.escapeHtml(book.title)}"
                ></bt-book-cover>
                <div class="info">
                    <div class="title">${this.escapeHtml(book.title)}</div>
                    <div class="progress-info">
                        <span>${progress}%</span>
                        ${isStale ? '<span class="stale-indicator">Stale</span>' : ''}
                    </div>
                    <bt-progress-bar value="${progress}"></bt-progress-bar>
                    ${pathBadge}

                    <div class="quick-progress" onclick="event.stopPropagation()">
                        <div class="quick-progress-form">
                            <input type="number"
                                   ref="pageInput"
                                   value="${book.current_page || 0}"
                                   min="0"
                                   max="${book.page_count || 9999}"
                                   onclick="event.stopPropagation()"
                            >
                            <span>/ ${book.page_count || '?'}</span>
                            <button ref="updateBtn">Update</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        const card = this.$('.reading-card');
        const updateBtn = this.ref('updateBtn');
        const pageInput = this.ref('pageInput');

        if (card) {
            card.addEventListener('click', () => {
                this.emit('book-click', { book: this._book });
            });
        }

        if (updateBtn && pageInput) {
            updateBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this._updateProgress(parseInt(pageInput.value, 10));
            });

            pageInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    await this._updateProgress(parseInt(pageInput.value, 10));
                }
            });
        }
    }

    async _updateProgress(page) {
        if (!this._book) return;

        const updateBtn = this.ref('updateBtn');
        if (updateBtn) {
            updateBtn.disabled = true;
            updateBtn.textContent = '...';
        }

        try {
            await api.updateBook(this._book.book_id, { current_page: page });
            this.emit('progress-updated', { bookId: this._book.book_id, page });
        } catch (error) {
            console.error('Error updating progress:', error);
            this.emit('toast', { message: 'Failed to update progress', type: 'error' });
        } finally {
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.textContent = 'Update';
            }
        }
    }
}

defineComponent('bt-reading-card', BtReadingCard);
