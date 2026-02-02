/**
 * bt-shelf-card - Warm Playback Card for home dashboard
 *
 * A 320x320px card with gradient header, stats strip, playback-style
 * progress bar, and increment controls for quick page updates.
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';
import { extractDominantColor } from '../../utils/color-extractor.js';

export class BtShelfCard extends BaseComponent {
    constructor() {
        super();
        this._book = null;
        this._saving = false;
        this._showInput = false;
        this._headerColor = null;
    }

    set book(book) {
        // Reset header color if cover URL changes
        if (this._book?.cover_image_url !== book?.cover_image_url) {
            this._headerColor = null;
        }
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
                width: 320px;
                height: 320px;
            }

            .card-warm-playback {
                width: 320px;
                height: 320px;
                background: var(--color-surface, #ffffff);
                border-radius: var(--radius-xl, 18px);
                overflow: hidden;
                box-shadow: var(--shadow-lg, 0 12px 28px rgba(40, 32, 20, 0.1), 0 6px 12px rgba(40, 32, 20, 0.06));
                display: flex;
                flex-direction: column;
                transition: transform var(--duration-fast, 150ms) var(--ease-out, cubic-bezier(0, 0, 0.2, 1)),
                            box-shadow var(--duration-normal, 250ms) var(--ease-out, cubic-bezier(0, 0, 0.2, 1));
                cursor: pointer;
            }

            .card-warm-playback:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-xl, 0 18px 40px rgba(40, 32, 20, 0.12), 0 10px 18px rgba(40, 32, 20, 0.08));
            }

            /* Card Header */
            .header {
                background: linear-gradient(135deg, var(--color-accent, #8b5e34) 0%, #a06840 100%);
                padding: 16px 20px;
                display: flex;
                gap: 16px;
                align-items: center;
                color: var(--color-text-inverse, #ffffff);
                flex-shrink: 0;
            }

            .header.warning {
                background: linear-gradient(135deg, #b07a2f 0%, #c98f3a 100%);
            }

            .header.teal {
                background: linear-gradient(135deg, #2f6f6d 0%, #3a8583 100%);
            }

            .header.purple {
                background: linear-gradient(135deg, #7b5c9e 0%, #8d6db0 100%);
            }

            /* Book Cover */
            .cover {
                width: 56px;
                height: 80px;
                border-radius: var(--radius-sm, 6px);
                flex-shrink: 0;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
                background-size: cover;
                background-position: center;
                background-color: #c8b7a6;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .cover-placeholder {
                font-size: 0.5rem;
                text-align: center;
                padding: 4px;
                color: rgba(255, 255, 255, 0.7);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 600;
                word-break: break-word;
                line-height: 1.2;
            }

            /* Book Info */
            .info {
                flex: 1;
                min-width: 0;
            }

            .book-title {
                font-weight: var(--font-semibold, 600);
                font-size: 0.95rem;
                margin-bottom: 4px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.3;
            }

            .book-author {
                font-size: 0.8rem;
                opacity: 0.8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Header Stat (Percentage) */
            .header-stat {
                text-align: right;
                flex-shrink: 0;
            }

            .header-stat-value {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 1.5rem;
                font-weight: var(--font-bold, 700);
                line-height: 1;
            }

            .header-stat-label {
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                opacity: 0.7;
            }

            /* Card Body */
            .body {
                padding: 16px 20px;
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            /* Learning Path Tags */
            .path-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-bottom: 12px;
                min-height: 24px;
            }

            .path-tag {
                font-size: 0.7rem;
                padding: 4px 10px;
                border-radius: var(--radius-full, 9999px);
                font-weight: var(--font-medium, 500);
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .path-tag .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .path-tag.neutral {
                background: var(--color-bg-secondary, #f1ede6);
                color: var(--color-text-secondary, #6b6051);
            }

            .path-tag.warning {
                background: rgba(176, 122, 47, 0.15);
                color: #b07a2f;
            }

            /* Stats Strip */
            .stats-strip {
                display: flex;
                gap: 1px;
                background: var(--color-border-subtle, #efe9df);
                margin: 0 -20px 12px;
                border-top: 1px solid var(--color-border-subtle, #efe9df);
                border-bottom: 1px solid var(--color-border-subtle, #efe9df);
            }

            .strip-stat {
                flex: 1;
                padding: 10px 8px;
                text-align: center;
                background: var(--color-surface, #ffffff);
            }

            .strip-stat-value {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.9rem;
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
            }

            .strip-stat-value.accent {
                color: var(--color-accent, #8b5e34);
            }

            .strip-stat-value.teal {
                color: #2f6f6d;
            }

            .strip-stat-value.warning {
                color: #b07a2f;
            }

            .strip-stat-label {
                font-size: 0.55rem;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                color: var(--color-text-muted, #8a7d6b);
                margin-top: 2px;
            }

            /* Playback Progress Bar */
            .playback-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 14px;
            }

            .time {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: 0.7rem;
                color: var(--color-text-muted, #8a7d6b);
                width: 36px;
            }

            .time.end {
                text-align: right;
            }

            .bar {
                flex: 1;
                height: 6px;
                background: var(--color-bg-secondary, #f1ede6);
                border-radius: 3px;
                overflow: hidden;
            }

            .bar-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--color-accent, #8b5e34) 0%, #a06840 100%);
                border-radius: 3px;
                transition: width var(--duration-normal, 250ms) var(--ease-out, cubic-bezier(0, 0, 0.2, 1));
            }

            .bar-fill.warning {
                background: linear-gradient(90deg, #b07a2f 0%, #c98f3a 100%);
            }

            /* Increment Controls */
            .controls {
                display: flex;
                gap: 10px;
                justify-content: center;
                align-items: center;
                margin-top: auto;
            }

            .ctrl-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1px solid var(--color-border, #e3ddd1);
                background: var(--color-surface, #ffffff);
                color: var(--color-text-secondary, #6b6051);
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: var(--font-semibold, 600);
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                transition: all var(--duration-fast, 150ms) var(--ease-out, cubic-bezier(0, 0, 0.2, 1));
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ctrl-btn:hover {
                border-color: var(--color-accent, #8b5e34);
                color: var(--color-accent, #8b5e34);
            }

            .ctrl-btn:focus {
                outline: none;
                box-shadow: 0 0 0 2px var(--color-bg-primary, #f7f4ef),
                            0 0 0 4px var(--color-accent, #8b5e34);
            }

            .ctrl-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .ctrl-btn.primary {
                width: 48px;
                height: 48px;
                background: var(--color-accent, #8b5e34);
                color: var(--color-text-inverse, #ffffff);
                border: none;
                font-size: 1.25rem;
            }

            .ctrl-btn.primary:hover {
                background: var(--color-accent-hover, #9a6a3e);
                transform: scale(1.05);
            }

            .ctrl-btn.primary.warning {
                background: #b07a2f;
            }

            .ctrl-btn.primary.warning:hover {
                background: #c98f3a;
            }

            /* Page input overlay */
            .page-input-overlay {
                position: absolute;
                bottom: 16px;
                left: 20px;
                right: 20px;
                display: flex;
                gap: 8px;
                align-items: center;
                background: var(--color-surface, #ffffff);
                padding: 8px;
                border-radius: var(--radius-md, 10px);
                box-shadow: var(--shadow-md, 0 8px 18px rgba(40, 32, 20, 0.08));
                border: 1px solid var(--color-border, #e3ddd1);
            }

            .page-input-overlay input {
                flex: 1;
                padding: 8px 12px;
                border-radius: var(--radius-sm, 6px);
                border: 1px solid var(--color-border, #e3ddd1);
                font-size: 1rem;
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                text-align: center;
            }

            .page-input-overlay input:focus {
                outline: none;
                border-color: var(--color-accent, #8b5e34);
                box-shadow: 0 0 0 2px var(--color-accent-muted, rgba(139, 94, 52, 0.15));
            }

            .page-input-overlay button {
                padding: 8px 16px;
                border-radius: var(--radius-sm, 6px);
                border: none;
                background: var(--color-accent, #8b5e34);
                color: var(--color-text-inverse, #ffffff);
                font-weight: var(--font-semibold, 600);
                cursor: pointer;
            }

            .page-input-overlay button:hover {
                background: var(--color-accent-hover, #9a6a3e);
            }

            .page-input-overlay button.cancel {
                background: transparent;
                color: var(--color-text-secondary, #6b6051);
                border: 1px solid var(--color-border, #e3ddd1);
            }

            /* Position relative for overlay */
            .body {
                position: relative;
            }

            /* Loading state */
            .saving .ctrl-btn {
                pointer-events: none;
                opacity: 0.6;
            }
        `;
    }

    template() {
        if (!this._book) {
            return '<div class="card-warm-playback"><div class="body" style="display: flex; align-items: center; justify-content: center; color: var(--color-text-muted);">Loading...</div></div>';
        }

        const book = this._book;
        const progress = book.progress_percent || 0;
        const currentPage = book.current_page || 0;
        const pageCount = book.page_count || 0;
        const paths = book.paths || [];

        const headerClass = this._getHeaderClass(book);
        const barFillClass = this._isStale(book) ? 'warning' : '';
        const primaryBtnClass = this._isStale(book) ? 'warning' : '';

        const lastReadDisplay = this._formatRelativeDate(book.last_read_at);
        const startedDisplay = this._formatStartDate(book.started_reading_at);
        const estLeftDisplay = this._calculateEstimatedDays(book);

        const lastReadValueClass = this._isStale(book) ? 'warning' : 'accent';

        return `
            <div class="card-warm-playback ${this._saving ? 'saving' : ''}" data-book-id="${book.book_id}">
                <div class="header ${headerClass}">
                    ${this._renderCover(book)}
                    <div class="info">
                        <div class="book-title">${this.escapeHtml(book.title)}</div>
                        <div class="book-author">${this.escapeHtml(book.author || 'Unknown Author')}</div>
                    </div>
                    <div class="header-stat">
                        <div class="header-stat-value">${progress}%</div>
                        <div class="header-stat-label">Complete</div>
                    </div>
                </div>
                <div class="body">
                    <div class="path-tags">
                        ${this._renderPathTags(paths, book)}
                    </div>
                    <div class="stats-strip">
                        <div class="strip-stat">
                            <div class="strip-stat-value ${lastReadValueClass}">${lastReadDisplay}</div>
                            <div class="strip-stat-label">Last Read</div>
                        </div>
                        <div class="strip-stat">
                            <div class="strip-stat-value">${estLeftDisplay}</div>
                            <div class="strip-stat-label">Est. Left</div>
                        </div>
                        <div class="strip-stat">
                            <div class="strip-stat-value">${startedDisplay}</div>
                            <div class="strip-stat-label">Started</div>
                        </div>
                    </div>
                    <div class="playback-bar">
                        <span class="time">${currentPage}</span>
                        <div class="bar"><div class="bar-fill ${barFillClass}" style="width: ${progress}%"></div></div>
                        <span class="time end">${pageCount || '?'}</span>
                    </div>
                    <div class="controls">
                        <button class="ctrl-btn" ref="btnMinus10" ${this._saving ? 'disabled' : ''}>-10</button>
                        <button class="ctrl-btn" ref="btnMinus1" ${this._saving ? 'disabled' : ''}>-1</button>
                        <button class="ctrl-btn primary ${primaryBtnClass}" ref="btnPrimary" ${this._saving ? 'disabled' : ''}>+</button>
                        <button class="ctrl-btn" ref="btnPlus1" ${this._saving ? 'disabled' : ''}>+1</button>
                        <button class="ctrl-btn" ref="btnPlus10" ${this._saving ? 'disabled' : ''}>+10</button>
                    </div>
                    ${this._showInput ? this._renderPageInput() : ''}
                </div>
            </div>
        `;
    }

    _renderCover(book) {
        if (book.cover_image_url) {
            return `<div class="cover" style="background-image: url('${book.cover_image_url}')"></div>`;
        }
        // Fallback: show abbreviated title
        const abbrev = (book.title || '').split(' ').slice(0, 3).join(' ');
        return `<div class="cover"><span class="cover-placeholder">${this.escapeHtml(abbrev)}</span></div>`;
    }

    _renderPathTags(paths, book) {
        if (!paths || paths.length === 0) {
            if (this._isStale(book)) {
                return `<span class="path-tag warning">${this._getDaysSinceRead(book)}d stale</span>`;
            }
            return '';
        }

        const tags = paths.slice(0, 2).map(path => {
            const color = this._getPathTagColor(path.color);
            return `
                <span class="path-tag" style="background: ${color.bg}; color: ${color.text}">
                    <span class="dot" style="background: ${path.color || '#8b5e34'}"></span>
                    ${this.escapeHtml(path.name)}
                </span>
            `;
        }).join('');

        // Add stale warning if applicable
        if (this._isStale(book)) {
            return tags + `<span class="path-tag warning">${this._getDaysSinceRead(book)}d stale</span>`;
        }

        return tags;
    }

    _getPathTagColor(hexColor) {
        // Convert hex to rgba with low opacity for background
        if (!hexColor) {
            return { bg: 'rgba(139, 94, 52, 0.12)', text: '#8b5e34' };
        }

        // Parse hex color
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        return {
            bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
            text: hexColor
        };
    }

    _renderPageInput() {
        const book = this._book;
        return `
            <div class="page-input-overlay" ref="inputOverlay">
                <input type="number" ref="pageInput" min="0" max="${book.page_count || 9999}"
                       value="${book.current_page || 0}" placeholder="Page">
                <button ref="saveInputBtn">Save</button>
                <button class="cancel" ref="cancelInputBtn">Cancel</button>
            </div>
        `;
    }

    afterRender() {
        const card = this.$('.card-warm-playback');

        // Extract and apply cover-based color
        this._extractCoverColor();

        // Card click (navigate to detail)
        if (card) {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking controls or input overlay
                if (e.target.closest('.controls') || e.target.closest('.page-input-overlay')) {
                    return;
                }
                this.emit('book-click', { book: this._book });
            });
        }

        // Increment buttons
        this._bindControlButton('btnMinus10', -10);
        this._bindControlButton('btnMinus1', -1);
        this._bindControlButton('btnPlus1', 1);
        this._bindControlButton('btnPlus10', 10);

        // Primary button opens input
        const btnPrimary = this.ref('btnPrimary');
        if (btnPrimary) {
            btnPrimary.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showInput = true;
                this.render();
                // Focus input after render
                setTimeout(() => {
                    const input = this.ref('pageInput');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 0);
            });
        }

        // Page input overlay
        if (this._showInput) {
            const saveBtn = this.ref('saveInputBtn');
            const cancelBtn = this.ref('cancelInputBtn');
            const pageInput = this.ref('pageInput');
            const overlay = this.ref('inputOverlay');

            if (overlay) {
                overlay.addEventListener('click', (e) => e.stopPropagation());
            }

            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._savePageInput();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._showInput = false;
                    this.render();
                });
            }

            if (pageInput) {
                pageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        this._savePageInput();
                    } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        this._showInput = false;
                        this.render();
                    }
                });
            }
        }
    }

    _bindControlButton(refName, amount) {
        const btn = this.ref(refName);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleIncrement(amount);
            });
        }
    }

    async _handleIncrement(amount) {
        if (!this._book || this._saving) return;

        const pageCount = this._book.page_count || 9999;
        const currentPage = this._book.current_page || 0;
        const newPage = Math.max(0, Math.min(pageCount, currentPage + amount));

        if (newPage === currentPage) return;

        await this._saveProgress(newPage);
    }

    async _savePageInput() {
        const pageInput = this.ref('pageInput');
        if (!pageInput) return;

        const newPage = parseInt(pageInput.value, 10);
        if (isNaN(newPage) || newPage < 0) return;

        this._showInput = false;
        await this._saveProgress(newPage);
    }

    async _saveProgress(newPage) {
        if (!this._book || this._saving) return;

        this._saving = true;
        this.render();

        try {
            await api.logProgress(this._book.book_id, { current_page: newPage });

            // Update local book state
            const pageCount = this._book.page_count;
            this._book.current_page = newPage;
            this._book.progress_percent = pageCount
                ? Math.round((newPage / pageCount) * 100)
                : 0;
            this._book.last_read_at = new Date().toISOString();

            this.emit('progress-logged', { bookId: this._book.book_id });
        } catch (error) {
            console.error('Failed to log progress:', error);
            this.emit('toast', { message: 'Failed to update progress', type: 'error' });
        } finally {
            this._saving = false;
            this.render();
        }
    }

    // Helper: Format relative date
    _formatRelativeDate(dateStr) {
        if (!dateStr) return '--';

        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1d ago';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Helper: Format start date
    _formatStartDate(dateStr) {
        if (!dateStr) return '--';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Helper: Calculate estimated days remaining
    _calculateEstimatedDays(book) {
        if (!book.page_count || !book.current_page) return '--';

        const remaining = book.page_count - book.current_page;
        if (remaining <= 0) return '0d';

        // Estimate: assume 15 pages/day default pace
        // In future, could calculate from actual reading history
        const pace = 15;
        const days = Math.ceil(remaining / pace);

        return `${days}d`;
    }

    // Helper: Get days since last read
    _getDaysSinceRead(book) {
        if (!book.last_read_at) return 999;
        const date = new Date(book.last_read_at);
        const now = new Date();
        return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    }

    // Helper: Check if book is stale (14+ days since last read)
    _isStale(book) {
        return this._getDaysSinceRead(book) >= 14;
    }

    // Helper: Determine header gradient class
    _getHeaderClass(book) {
        // Stale books get warning gradient
        if (this._isStale(book)) {
            return 'warning';
        }

        // Default: bronze
        return '';
    }

    // Extract and apply cover color to header
    async _extractCoverColor() {
        if (!this._book?.cover_image_url || this._headerColor) return;

        const colorData = await extractDominantColor(this._book.cover_image_url);
        this._headerColor = colorData;

        // Apply directly to DOM without full re-render
        // Only apply if book is not stale (stale uses warning gradient)
        const header = this.$('.header');
        if (header && !this._isStale(this._book)) {
            header.style.background = colorData.gradient;
        }
    }
}

defineComponent('bt-shelf-card', BtShelfCard);
