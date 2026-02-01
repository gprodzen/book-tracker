/**
 * bt-book-card - Book display card with multiple variants
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import './bt-book-cover.js';
import './bt-progress-bar.js';
import './bt-status-badge.js';

export class BtBookCard extends BaseComponent {
    static get observedAttributes() {
        return ['book-id', 'variant'];
    }

    constructor() {
        super();
        this._book = null;
    }

    /**
     * Set book data
     * @param {Object} book
     */
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

            .book-card {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
                cursor: pointer;
            }

            .book-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .book-info {
                padding: 12px;
            }

            .book-title {
                font-weight: 600;
                font-size: 0.875rem;
                margin-bottom: 4px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                color: var(--text, #c9d1d9);
            }

            .book-author {
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
                margin-bottom: 8px;
            }

            .book-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
            }

            .book-rating {
                color: var(--yellow, #d29922);
            }

            /* Reading card variant */
            :host([variant="reading"]) .book-card {
                flex: 0 0 160px;
            }

            :host([variant="reading"]) bt-book-cover {
                height: 180px;
            }

            :host([variant="reading"]) .book-info {
                padding: 10px;
            }

            :host([variant="reading"]) .book-title {
                font-size: 0.8rem;
                -webkit-line-clamp: 1;
            }

            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.7rem;
                color: var(--text-muted, #8b949e);
                margin-top: 4px;
                margin-bottom: 6px;
            }

            .stale-indicator {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(248, 81, 73, 0.2);
                color: var(--red, #f85149);
            }

            .path-badge {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: var(--bg-tertiary, #21262d);
                color: var(--text-muted, #8b949e);
                margin-top: 4px;
                display: inline-block;
            }

            /* Pipeline card variant */
            :host([variant="pipeline"]) .book-card {
                background: var(--bg-tertiary, #21262d);
                padding: 10px;
                cursor: grab;
            }

            :host([variant="pipeline"]) .book-card:hover {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transform: none;
            }

            :host([variant="pipeline"]) .book-card.dragging {
                opacity: 0.5;
                cursor: grabbing;
            }

            :host([variant="pipeline"]) .book-card.drag-over {
                border-color: var(--accent, #58a6ff);
                box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.3);
            }

            .pipeline-layout {
                display: flex;
                gap: 10px;
            }

            .pipeline-cover {
                width: 50px;
                height: 75px;
                flex-shrink: 0;
            }

            .pipeline-info {
                flex: 1;
                min-width: 0;
            }

            .pipeline-title {
                font-size: 0.8rem;
                font-weight: 600;
                margin-bottom: 2px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .pipeline-author {
                font-size: 0.7rem;
                color: var(--text-muted, #8b949e);
                margin-bottom: 6px;
            }

            .pipeline-meta {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }

            .pipeline-progress {
                font-size: 0.7rem;
                color: var(--accent, #58a6ff);
            }

            .path-tag {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: var(--bg-secondary, #161b22);
            }

            /* Compact variant */
            :host([variant="compact"]) .book-card {
                display: flex;
                gap: 12px;
                padding: 10px;
            }

            :host([variant="compact"]) bt-book-cover {
                width: 40px;
                height: 60px;
                flex-shrink: 0;
            }

            :host([variant="compact"]) .book-info {
                padding: 0;
                flex: 1;
                min-width: 0;
            }

            :host([variant="compact"]) .book-title {
                font-size: 0.8rem;
                -webkit-line-clamp: 1;
            }

            :host([variant="compact"]) .book-author {
                margin-bottom: 4px;
            }
        `;
    }

    template() {
        if (!this._book) {
            return '<bt-loading type="skeleton-card"></bt-loading>';
        }

        const variant = this.getAttribute('variant') || 'default';

        switch (variant) {
            case 'reading':
                return this._renderReadingCard();
            case 'pipeline':
                return this._renderPipelineCard();
            case 'compact':
                return this._renderCompactCard();
            default:
                return this._renderDefaultCard();
        }
    }

    _renderDefaultCard() {
        const book = this._book;
        const progress = book.progress_percent || 0;

        return `
            <div class="book-card" data-book-id="${book.book_id}">
                <bt-book-cover
                    src="${book.cover_image_url || ''}"
                    title="${this.escapeHtml(book.title)}"
                ></bt-book-cover>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-author">${this.escapeHtml(book.author)}</div>
                    ${book.status === 'reading' ? `
                        <bt-progress-bar value="${progress}" style="margin-bottom: 8px;"></bt-progress-bar>
                    ` : ''}
                    <div class="book-meta">
                        <bt-status-badge status="${book.status}"></bt-status-badge>
                        ${book.my_rating ? `<span class="book-rating">${this.renderStars(book.my_rating)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _renderReadingCard() {
        const book = this._book;
        const progress = book.progress_percent || 0;
        const isStale = book.is_stale === 1;

        const pathBadge = book.paths && book.paths.length > 0
            ? `<span class="path-badge" style="border-left: 2px solid ${book.paths[0].color}">${this.escapeHtml(book.paths[0].name)}</span>`
            : '';

        return `
            <div class="book-card" data-book-id="${book.book_id}">
                <bt-book-cover
                    src="${book.cover_image_url || ''}"
                    title="${this.escapeHtml(book.title)}"
                ></bt-book-cover>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="progress-info">
                        <span>${progress}%</span>
                        ${isStale ? '<span class="stale-indicator">Stale</span>' : ''}
                    </div>
                    <bt-progress-bar value="${progress}"></bt-progress-bar>
                    ${pathBadge}
                </div>
            </div>
        `;
    }

    _renderPipelineCard() {
        const book = this._book;
        const progress = book.progress_percent || 0;
        const isStale = book.is_stale === 1;

        const pathTags = book.paths && book.paths.length > 0
            ? book.paths.map(p => `<span class="path-tag" style="border-left: 2px solid ${p.color}">${this.escapeHtml(p.name)}</span>`).join('')
            : '';

        return `
            <div class="book-card"
                 draggable="true"
                 data-book-id="${book.book_id}"
                 data-user-book-id="${book.user_book_id}"
                 data-status="${book.status}">
                <div class="pipeline-layout">
                    <div class="pipeline-cover">
                        <bt-book-cover
                            src="${book.cover_image_url || ''}"
                            title="${this.escapeHtml(book.title)}"
                            size="small"
                        ></bt-book-cover>
                    </div>
                    <div class="pipeline-info">
                        <div class="pipeline-title">${this.escapeHtml(book.title)}</div>
                        <div class="pipeline-author">${this.escapeHtml(book.author)}</div>
                        <div class="pipeline-meta">
                            ${book.status === 'reading' ? `<span class="pipeline-progress">${progress}%</span>` : ''}
                            ${isStale ? '<span class="stale-indicator">30+ days</span>' : ''}
                            ${book.status === 'finished' && book.my_rating ? `<span class="book-rating">${this.renderStars(book.my_rating)}</span>` : ''}
                            ${pathTags}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderCompactCard() {
        const book = this._book;

        return `
            <div class="book-card" data-book-id="${book.book_id}">
                <bt-book-cover
                    src="${book.cover_image_url || ''}"
                    title="${this.escapeHtml(book.title)}"
                    size="small"
                ></bt-book-cover>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-author">${this.escapeHtml(book.author)}</div>
                    <bt-status-badge status="${book.status}"></bt-status-badge>
                </div>
            </div>
        `;
    }

    afterRender() {
        const card = this.$('.book-card');
        if (card) {
            card.addEventListener('click', () => {
                this.emit('book-click', { book: this._book });
            });
        }
    }
}

defineComponent('bt-book-card', BtBookCard);
