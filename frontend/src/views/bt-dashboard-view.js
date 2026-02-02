/**
 * bt-dashboard-view - Home (Now Reading Shelf) view
 *
 * Displays currently reading books as Warm Playback Cards in a responsive grid,
 * along with objectives in progress.
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-progress-bar.js';
import '../components/books/bt-shelf-card.js';

export class BtDashboardView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            home: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
                --card-width: 320px;
                --card-height: 320px;
            }

            .page-header {
                margin-bottom: var(--space-6, 24px);
            }

            .page-title {
                font-family: var(--font-display, 'Libre Baskerville', Georgia, serif);
                font-size: var(--text-3xl, 2.25rem);
                font-weight: var(--font-bold, 700);
                color: var(--color-text-primary, #2b2418);
                margin-bottom: var(--space-2, 8px);
            }

            .page-subtitle {
                font-size: var(--text-base, 1rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .section {
                margin-bottom: var(--space-8, 32px);
            }

            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-4, 16px);
                margin-bottom: var(--space-4, 16px);
            }

            .section-title {
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-semibold, 600);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.05em);
                color: var(--color-text-secondary, #6b6051);
            }

            .secondary-btn {
                background: transparent;
                border: 1px solid var(--color-border, #e3ddd1);
                border-radius: var(--radius-md, 10px);
                padding: 8px 12px;
                cursor: pointer;
                color: var(--color-text-secondary, #6b6051);
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-medium, 500);
                transition: all var(--duration-fast, 150ms) var(--ease-out);
            }

            .secondary-btn:hover {
                border-color: var(--color-accent, #8b5e34);
                color: var(--color-accent, #8b5e34);
            }

            /* Books Shelf - Horizontal scrolling row */
            .books-shelf {
                display: flex;
                gap: var(--space-6, 24px);
                overflow-x: auto;
                overflow-y: visible;
                padding: var(--space-2, 8px) 0 var(--space-4, 16px);
                margin: 0 calc(-1 * var(--space-4, 16px));
                padding-left: var(--space-4, 16px);
                padding-right: var(--space-4, 16px);

                /* Scroll snap for card-by-card scrolling */
                scroll-snap-type: x proximity;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;

                /* Styled scrollbar */
                scrollbar-width: thin;
                scrollbar-color: var(--color-border, #e3ddd1) transparent;
            }

            .books-shelf::-webkit-scrollbar {
                height: 6px;
            }

            .books-shelf::-webkit-scrollbar-track {
                background: transparent;
            }

            .books-shelf::-webkit-scrollbar-thumb {
                background: var(--color-border, #e3ddd1);
                border-radius: 3px;
            }

            .books-shelf::-webkit-scrollbar-thumb:hover {
                background: var(--color-text-muted, #8a7d6b);
            }

            .books-shelf > bt-shelf-card {
                scroll-snap-align: start;
                flex-shrink: 0;
            }

            /* Objectives Grid */
            .objective-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: var(--space-4, 16px);
            }

            .objective-card {
                background: var(--color-surface, #ffffff);
                border: 1px solid var(--color-border, #e3ddd1);
                border-radius: var(--radius-lg, 14px);
                overflow: hidden;
                box-shadow: var(--shadow-sm, 0 1px 2px rgba(40, 32, 20, 0.04), 0 2px 4px rgba(40, 32, 20, 0.06));
                transition: transform var(--duration-fast, 150ms) var(--ease-out),
                            box-shadow var(--duration-normal, 250ms) var(--ease-out);
                cursor: pointer;
            }

            .objective-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-md, 0 8px 18px rgba(40, 32, 20, 0.08));
            }

            .objective-header {
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .objective-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .objective-title {
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
                flex: 1;
                min-width: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .objective-percent {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: var(--text-lg, 1.125rem);
                font-weight: var(--font-bold, 700);
                color: var(--color-accent, #8b5e34);
            }

            /* Stats strip for objectives - matches card pattern */
            .objective-stats {
                display: flex;
                gap: 1px;
                background: var(--color-border-subtle, #efe9df);
                border-top: 1px solid var(--color-border-subtle, #efe9df);
            }

            .obj-stat {
                flex: 1;
                padding: 12px 8px;
                text-align: center;
                background: var(--color-surface, #ffffff);
            }

            .obj-stat-value {
                font-family: var(--font-mono, 'IBM Plex Mono', monospace);
                font-size: var(--text-base, 1rem);
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
            }

            .obj-stat-value.accent {
                color: var(--color-accent, #8b5e34);
            }

            .obj-stat-value.success {
                color: var(--color-success, #2f8f5b);
            }

            .obj-stat-label {
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                color: var(--color-text-muted, #8a7d6b);
                margin-top: 2px;
            }

            .objective-progress {
                padding: 0 16px 16px;
            }

            .objective-bar {
                height: 6px;
                background: var(--color-bg-secondary, #f1ede6);
                border-radius: 3px;
                overflow: hidden;
            }

            .objective-bar-fill {
                height: 100%;
                border-radius: 3px;
                transition: width var(--duration-normal, 250ms) var(--ease-out);
            }

            /* Empty state styling */
            .empty-books {
                grid-column: 1 / -1;
                text-align: center;
                padding: var(--space-8, 32px);
                color: var(--color-text-muted, #8a7d6b);
            }

            .empty-books-icon {
                font-size: 3rem;
                margin-bottom: var(--space-4, 16px);
                opacity: 0.5;
            }

            .empty-books-title {
                font-size: var(--text-lg, 1.125rem);
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-secondary, #6b6051);
                margin-bottom: var(--space-2, 8px);
            }

            .empty-books-desc {
                font-size: var(--text-sm, 0.875rem);
            }
        `;
    }

    template() {
        const { loading, error, home } = this.state;

        if (loading) {
            return '<bt-loading text="Loading home..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load home"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        if (!home) {
            return '<bt-loading text="Loading home..."></bt-loading>';
        }

        const objectives = home.objectives_summary || [];
        const now = home.now || [];

        return `
            <div class="page-header">
                <h1 class="page-title">Now Reading</h1>
                <p class="page-subtitle">A calm place to log progress and keep momentum.</p>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">Current Books</h2>
                    <button class="secondary-btn" ref="viewLibraryBtn">View Library</button>
                </div>
                <div class="books-shelf">
                    ${now.length === 0 ? `
                        <div class="empty-books">
                            <div class="empty-books-icon">📚</div>
                            <div class="empty-books-title">Nothing in progress</div>
                            <div class="empty-books-desc">Start reading a book to see it here.</div>
                        </div>
                    ` : now.map((book, index) => `
                        <bt-shelf-card class="reading-card" data-book-index="${index}"></bt-shelf-card>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">Objectives in Progress</h2>
                    <button class="secondary-btn" ref="viewObjectivesBtn">View Objectives</button>
                </div>
                ${objectives.length === 0 ? `
                    <bt-empty-state title="No objectives yet" description="Create an objective to focus your reading."></bt-empty-state>
                ` : `
                    <div class="objective-grid">
                        ${objectives.map(obj => this._renderObjectiveCard(obj)).join('')}
                    </div>
                `}
            </div>
        `;
    }

    _renderObjectiveCard(obj) {
        const total = obj.total_books || 0;
        const completed = obj.completed_books || 0;
        const progressPct = obj.progress_pct || 0;
        const counts = obj.counts_by_status || {};
        const reading = counts.reading || 0;
        const queued = counts.queued || 0;

        // Determine progress bar color based on objective color
        const barColor = obj.color || '#8b5e34';

        return `
            <div class="objective-card" data-path-id="${obj.id}">
                <div class="objective-header">
                    <span class="objective-dot" style="background: ${obj.color || '#8b5e34'}"></span>
                    <span class="objective-title">${this.escapeHtml(obj.name)}</span>
                    <span class="objective-percent">${progressPct}%</span>
                </div>
                <div class="objective-stats">
                    <div class="obj-stat">
                        <div class="obj-stat-value success">${completed}</div>
                        <div class="obj-stat-label">Finished</div>
                    </div>
                    <div class="obj-stat">
                        <div class="obj-stat-value accent">${reading}</div>
                        <div class="obj-stat-label">Reading</div>
                    </div>
                    <div class="obj-stat">
                        <div class="obj-stat-value">${queued}</div>
                        <div class="obj-stat-label">Queued</div>
                    </div>
                    <div class="obj-stat">
                        <div class="obj-stat-value">${total}</div>
                        <div class="obj-stat-label">Total</div>
                    </div>
                </div>
                <div class="objective-progress">
                    <div class="objective-bar">
                        <div class="objective-bar-fill" style="width: ${progressPct}%; background: ${barColor}"></div>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        const { home } = this.state;
        if (!home) return;

        // View Library button
        this.addListener(this.ref('viewLibraryBtn'), 'click', () => router.navigate('library'));

        // View Objectives button
        this.addListener(this.ref('viewObjectivesBtn'), 'click', () => router.navigate('paths'));

        // Set up reading cards
        const readingCards = this.$$('.reading-card');
        (home.now || []).forEach((book, index) => {
            const card = readingCards[index];
            if (card) {
                card.book = book;
                this.addListener(card, 'book-click', (e) => {
                    this.emit('show-book-detail', { bookId: e.detail.book.book_id });
                });
                this.addListener(card, 'progress-logged', () => {
                    this._loadHome({ skipCache: true });
                });
            }
        });

        // Objective card clicks
        this.$$('.objective-card').forEach(card => {
            this.addListener(card, 'click', () => {
                const pathId = card.dataset.pathId;
                if (pathId) {
                    router.navigate('paths', { id: pathId });
                }
            });
        });
    }

    async onConnect() {
        await this._loadHome();

        // Subscribe to book updates (status changes from modal)
        this._unsubscribe = events.on(EVENT_NAMES.BOOK_UPDATED, () => {
            this._loadHome({ skipCache: true });
        });
    }

    onDisconnect() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    }

    async _loadHome(options = {}) {
        this.setState({ loading: true, error: null });
        try {
            const home = await api.getHome(options);
            this.setState({ loading: false, home });
        } catch (error) {
            console.error('Home error:', error);
            this.setState({ loading: false, error: 'Failed to load home. Make sure the backend is running.' });
        }
    }

    async refresh() {
        await this._loadHome({ skipCache: true });
    }
}

defineComponent('bt-dashboard-view', BtDashboardView);
