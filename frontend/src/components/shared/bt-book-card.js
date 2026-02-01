/**
 * bt-book-card - Book display card with multiple variants
 *
 * Polished with layered shadows, hover effects, and smooth transitions.
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
                background: var(--color-surface, #FFFFFF);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 18px);
                overflow: hidden;
                cursor: pointer;
                transition:
                    transform var(--duration-normal, 250ms) var(--ease-spring-soft, cubic-bezier(0.34, 1.56, 0.64, 1)),
                    box-shadow var(--duration-normal, 250ms) var(--ease-out),
                    border-color var(--duration-fast, 150ms) var(--ease-out);
            }

            .book-card:hover {
                transform: translateY(-6px) scale(1.01);
                border-color: var(--color-accent, #8B4513);
                box-shadow: var(--shadow-card-hover,
                    0 4px 8px rgba(44, 36, 22, 0.06),
                    0 8px 24px rgba(44, 36, 22, 0.1),
                    0 16px 32px rgba(44, 36, 22, 0.06),
                    0 0 0 1px rgba(139, 69, 19, 0.08));
            }

            .book-card:active {
                transform: translateY(-2px) scale(0.99);
                transition: transform var(--duration-fast, 150ms) var(--ease-out);
            }

            /* Cover image hover effect with zoom */
            .book-card bt-book-cover {
                transition:
                    filter var(--duration-normal, 250ms) var(--ease-out),
                    transform var(--duration-normal, 250ms) var(--ease-out);
                filter: grayscale(10%) brightness(0.97);
            }

            .book-card:hover bt-book-cover {
                filter: grayscale(0%) brightness(1);
                transform: scale(1.03);
            }

            .book-info {
                padding: var(--space-3, 12px);
            }

            .book-title {
                font-weight: var(--font-semibold, 600);
                font-size: var(--text-sm, 0.875rem);
                margin-bottom: var(--space-1, 4px);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                color: var(--color-text-primary, #2C2416);
                line-height: var(--leading-snug, 1.375);
            }

            .book-author {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
                margin-bottom: var(--space-2, 8px);
            }

            .book-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            .book-rating {
                color: var(--color-warning, #B8860B);
                font-family: var(--font-mono);
            }

            /* ================================================================
               Reading card variant
               ================================================================ */
            :host([variant="reading"]) .book-card {
                flex: 0 0 160px;
            }

            :host([variant="reading"]) bt-book-cover {
                height: 180px;
            }

            :host([variant="reading"]) .book-info {
                padding: var(--space-3, 12px);
            }

            :host([variant="reading"]) .book-title {
                font-size: var(--text-sm, 0.875rem);
                -webkit-line-clamp: 1;
            }

            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
                margin-top: var(--space-1, 4px);
                margin-bottom: var(--space-2, 8px);
            }

            .progress-percent {
                font-family: var(--font-mono);
                color: var(--color-accent, #8B4513);
                font-weight: var(--font-medium, 500);
            }

            .stale-indicator {
                font-size: var(--text-xs, 0.75rem);
                padding: var(--space-1, 4px) var(--space-2, 8px);
                border-radius: var(--radius-sm, 4px);
                background: var(--color-error-muted, rgba(160, 82, 45, 0.15));
                color: var(--color-error, #A0522D);
                font-weight: var(--font-medium, 500);
            }

            .path-badge {
                font-size: var(--text-xs, 0.75rem);
                padding: var(--space-1, 4px) var(--space-2, 8px);
                border-radius: var(--radius-sm, 4px);
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-secondary, #5C5244);
                margin-top: var(--space-2, 8px);
                display: inline-block;
                border-left: 2px solid;
            }

            /* ================================================================
               Pipeline card variant
               ================================================================ */
            :host([variant="pipeline"]) .book-card {
                background: var(--color-bg-tertiary, #EDE6DB);
                padding: var(--space-3, 12px);
                cursor: grab;
                border-radius: var(--radius-lg, 14px);
            }

            :host([variant="pipeline"]) .book-card:hover {
                box-shadow: var(--shadow-md,
                    0 2px 4px rgba(44, 36, 22, 0.06),
                    0 4px 12px rgba(44, 36, 22, 0.08),
                    0 8px 24px rgba(44, 36, 22, 0.04));
                transform: translateY(-2px);
            }

            :host([variant="pipeline"]) .book-card:active {
                transform: scale(0.99);
            }

            :host([variant="pipeline"]) .book-card.dragging {
                opacity: 0.8;
                cursor: grabbing;
                transform: rotate(2deg) scale(1.02);
                box-shadow: var(--shadow-xl,
                    0 8px 16px rgba(44, 36, 22, 0.06),
                    0 16px 32px rgba(44, 36, 22, 0.08),
                    0 24px 48px rgba(44, 36, 22, 0.06));
            }

            :host([variant="pipeline"]) .book-card.drag-over {
                border-color: var(--color-accent, #8B4513);
                box-shadow: 0 0 0 3px var(--color-accent-muted, rgba(139, 69, 19, 0.15));
            }

            .pipeline-layout {
                display: flex;
                gap: var(--space-3, 12px);
            }

            .pipeline-cover {
                width: 50px;
                height: 75px;
                flex-shrink: 0;
                border-radius: var(--radius-sm, 4px);
                overflow: hidden;
            }

            .pipeline-info {
                flex: 1;
                min-width: 0;
            }

            .pipeline-title {
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-semibold, 600);
                margin-bottom: var(--space-1, 4px);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                color: var(--color-text-primary, #2C2416);
                line-height: var(--leading-snug, 1.375);
            }

            .pipeline-author {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
                margin-bottom: var(--space-2, 8px);
            }

            .pipeline-meta {
                display: flex;
                gap: var(--space-2, 8px);
                flex-wrap: wrap;
                align-items: center;
            }

            .pipeline-progress {
                font-size: var(--text-xs, 0.75rem);
                font-family: var(--font-mono);
                color: var(--color-accent, #8B4513);
                font-weight: var(--font-medium, 500);
            }

            .path-tag {
                font-size: var(--text-xs, 0.75rem);
                padding: var(--space-1, 4px) var(--space-2, 8px);
                border-radius: var(--radius-sm, 4px);
                background: var(--color-bg-secondary, #F5F0E8);
                color: var(--color-text-secondary, #5C5244);
                border-left: 2px solid;
            }

            /* ================================================================
               Compact variant
               ================================================================ */
            :host([variant="compact"]) .book-card {
                display: flex;
                gap: var(--space-3, 12px);
                padding: var(--space-3, 12px);
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
                font-size: var(--text-sm, 0.875rem);
                -webkit-line-clamp: 1;
            }

            :host([variant="compact"]) .book-author {
                margin-bottom: var(--space-1, 4px);
            }

            /* ================================================================
               Staggered entrance animation support
               ================================================================ */
            :host([data-stagger-index]) .book-card {
                opacity: 0;
                animation: cardSpringIn var(--duration-slow, 350ms) var(--ease-spring-soft, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
            }

            :host([data-stagger-index="0"]) .book-card { animation-delay: 0ms; }
            :host([data-stagger-index="1"]) .book-card { animation-delay: 50ms; }
            :host([data-stagger-index="2"]) .book-card { animation-delay: 100ms; }
            :host([data-stagger-index="3"]) .book-card { animation-delay: 150ms; }
            :host([data-stagger-index="4"]) .book-card { animation-delay: 200ms; }
            :host([data-stagger-index="5"]) .book-card { animation-delay: 250ms; }

            @keyframes cardSpringIn {
                0% {
                    opacity: 0;
                    transform: translateY(16px) scale(0.95);
                }
                60% {
                    transform: translateY(-2px) scale(1.01);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .book-card {
                    transition: border-color var(--duration-fast, 150ms) var(--ease-out);
                }

                .book-card:hover,
                .book-card:active {
                    transform: none;
                }

                .book-card bt-book-cover {
                    transition: none;
                }

                .book-card:hover bt-book-cover {
                    transform: none;
                }

                :host([data-stagger-index]) .book-card {
                    animation: none;
                    opacity: 1;
                }
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
            ? `<span class="path-badge" style="border-left-color: ${book.paths[0].color}">${this.escapeHtml(book.paths[0].name)}</span>`
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
                        <span class="progress-percent">${progress}%</span>
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
            ? book.paths.map(p => `<span class="path-tag" style="border-left-color: ${p.color}">${this.escapeHtml(p.name)}</span>`).join('')
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
