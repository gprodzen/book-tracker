/**
 * bt-pipeline-view - Kanban-style pipeline view with drag-and-drop
 *
 * Polished with gradient headers, smooth drag states, and refined styling.
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-book-card.js';

export class BtPipelineView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            pipeline: null,
            wipLimit: 5
        });
        this._draggedCard = null;
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .page-header {
                margin-bottom: var(--space-6, 24px);
            }

            .page-title {
                font-size: var(--text-2xl, 1.75rem);
                font-weight: var(--font-bold, 700);
                color: var(--color-text-primary, #2C2416);
                margin-bottom: var(--space-2, 8px);
            }

            .page-subtitle {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            .pipeline {
                display: flex;
                gap: var(--space-4, 16px);
                overflow-x: auto;
                padding-bottom: var(--space-4, 16px);
                min-height: calc(100vh - 220px);
            }

            .pipeline::-webkit-scrollbar {
                height: 8px;
            }

            .pipeline::-webkit-scrollbar-track {
                background: var(--color-bg-primary, #FAF7F2);
                border-radius: var(--radius-full, 9999px);
            }

            .pipeline::-webkit-scrollbar-thumb {
                background: var(--color-bg-tertiary, #EDE6DB);
                border-radius: var(--radius-full, 9999px);
            }

            .pipeline::-webkit-scrollbar-thumb:hover {
                background: var(--color-border, #D4C9B8);
            }

            .column {
                flex: 0 0 300px;
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border-subtle, #E5DED2);
                border-radius: var(--radius-xl, 12px);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 220px);
                overflow: hidden;
            }

            .column-header {
                padding: var(--space-4, 16px);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                background: linear-gradient(
                    180deg,
                    var(--color-bg-secondary, #F5F0E8) 0%,
                    rgba(245, 240, 232, 0.95) 100%
                );
                border-bottom: 1px solid var(--color-border-subtle, #E5DED2);
                border-radius: var(--radius-xl, 12px) var(--radius-xl, 12px) 0 0;
                z-index: 1;
            }

            .column-title-group {
                display: flex;
                flex-direction: column;
                gap: var(--space-1, 4px);
            }

            .column-title {
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-semibold, 600);
                text-transform: uppercase;
                letter-spacing: var(--tracking-wide, 0.025em);
                color: var(--color-text-primary, #2C2416);
            }

            .column-subtitle {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8B7E6A);
            }

            .column-count {
                font-size: var(--text-sm, 0.875rem);
                font-family: var(--font-mono);
                font-weight: var(--font-medium, 500);
                padding: var(--space-1, 4px) var(--space-3, 12px);
                border-radius: var(--radius-full, 9999px);
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-secondary, #5C5244);
                min-width: 32px;
                text-align: center;
            }

            .column-count.warning {
                background: var(--color-warning-muted, rgba(251, 191, 36, 0.15));
                color: var(--color-warning, #FBBF24);
            }

            .column-count.over {
                background: var(--color-error-muted, rgba(248, 113, 113, 0.15));
                color: var(--color-error, #F87171);
            }

            .column-books {
                padding: var(--space-3, 12px);
                overflow-y: auto;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
                transition: background var(--duration-fast, 150ms) var(--ease-out);
            }

            .column-books::-webkit-scrollbar {
                width: 6px;
            }

            .column-books::-webkit-scrollbar-track {
                background: transparent;
            }

            .column-books::-webkit-scrollbar-thumb {
                background: var(--color-bg-tertiary, #EDE6DB);
                border-radius: var(--radius-full, 9999px);
            }

            /* Drop zone states */
            .column-books.drag-over {
                background: var(--color-accent-subtle, rgba(139, 69, 19, 0.08));
                border: 2px dashed var(--color-accent, #8B4513);
                border-radius: var(--radius-lg, 8px);
                margin: var(--space-3, 12px);
                margin-top: 0;
            }

            .column-books.drag-over::before {
                content: 'Drop here';
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-4, 16px);
                color: var(--color-accent, #8B4513);
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-medium, 500);
            }

            /* Empty column state */
            .column-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-8, 32px) var(--space-4, 16px);
                text-align: center;
                color: var(--color-text-muted, #8B7E6A);
            }

            .column-empty-icon {
                font-size: 2rem;
                margin-bottom: var(--space-2, 8px);
                opacity: 0.5;
            }

            .column-empty-text {
                font-size: var(--text-sm, 0.875rem);
            }

            bt-book-card {
                display: block;
            }

            /* Column-specific accent colors */
            .column[data-status="want_to_read"] .column-title {
                color: var(--color-want-to-read, #7B5C9E);
            }

            .column[data-status="queued"] .column-title {
                color: var(--color-queued, #2E7D4A);
            }

            .column[data-status="reading"] .column-title {
                color: var(--color-reading, #8B4513);
            }

            .column[data-status="finished"] .column-title {
                color: var(--color-finished, #2E7D4A);
            }

            @media (max-width: 768px) {
                .pipeline {
                    flex-direction: column;
                    min-height: auto;
                }

                .column {
                    flex: none;
                    width: 100%;
                    max-height: 400px;
                }

                .page-header {
                    margin-bottom: var(--space-4, 16px);
                }
            }
        `;
    }

    template() {
        const { loading, error, pipeline, wipLimit } = this.state;

        if (loading) {
            return '<bt-loading text="Loading pipeline..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load pipeline"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        if (!pipeline) {
            return '<bt-loading text="Loading pipeline..."></bt-loading>';
        }

        const readingCount = pipeline.reading ? pipeline.reading.length : 0;

        const columns = [
            { key: 'want_to_read', title: 'Want to Read', subtitle: 'Wishlist', icon: '💭' },
            { key: 'queued', title: 'Queued', subtitle: 'Up next', icon: '📋' },
            { key: 'reading', title: 'Reading', subtitle: `${readingCount}/${wipLimit} WIP`, isWip: true, icon: '📖' },
            { key: 'finished', title: 'Finished', subtitle: 'Completed', icon: '✅' }
        ];

        return `
            <div class="page-header">
                <h1 class="page-title">Pipeline</h1>
                <p class="page-subtitle">Drag and drop books to change their status</p>
            </div>
            <div class="pipeline">
                ${columns.map(col => this._renderColumn(col, pipeline[col.key] || [], wipLimit)).join('')}
            </div>
        `;
    }

    _renderColumn(col, books, wipLimit) {
        const count = books.length;
        let countClass = '';

        if (col.isWip) {
            if (count >= wipLimit) countClass = 'over';
            else if (count >= wipLimit - 1) countClass = 'warning';
        }

        const isEmpty = books.length === 0;

        return `
            <div class="column" data-status="${col.key}">
                <div class="column-header">
                    <div class="column-title-group">
                        <span class="column-title">${col.title}</span>
                        ${col.subtitle ? `<span class="column-subtitle">${col.subtitle}</span>` : ''}
                    </div>
                    <span class="column-count ${countClass}">${count}</span>
                </div>
                <div class="column-books" data-status="${col.key}">
                    ${isEmpty ? `
                        <div class="column-empty">
                            <span class="column-empty-icon">${col.icon}</span>
                            <span class="column-empty-text">No books</span>
                        </div>
                    ` : books.map((book, index) => `
                        <bt-book-card
                            variant="pipeline"
                            data-book-id="${book.book_id}"
                            data-user-book-id="${book.user_book_id}"
                            data-status="${book.status}"
                            data-stagger-index="${Math.min(index, 5)}"
                        ></bt-book-card>
                    `).join('')}
                </div>
            </div>
        `;
    }

    afterRender() {
        const { pipeline } = this.state;
        if (!pipeline) return;

        // Set book data on all cards
        const allBooks = [
            ...(pipeline.want_to_read || []),
            ...(pipeline.queued || []),
            ...(pipeline.reading || []),
            ...(pipeline.finished || [])
        ];

        allBooks.forEach(book => {
            const card = this.$(`bt-book-card[data-book-id="${book.book_id}"]`);
            if (card) {
                card.book = book;
            }
        });

        // Set up drag and drop
        this._setupDragAndDrop();

        // Add click handlers for book details
        this.$$('bt-book-card').forEach(card => {
            card.addEventListener('book-click', (e) => {
                this.emit('show-book-detail', { bookId: e.detail.book.book_id });
            });
        });
    }

    _setupDragAndDrop() {
        // Make cards draggable
        this.$$('bt-book-card[variant="pipeline"]').forEach(card => {
            const innerCard = card.shadowRoot?.querySelector('.book-card');
            if (innerCard) {
                innerCard.addEventListener('dragstart', (e) => this._handleDragStart(e, card));
                innerCard.addEventListener('dragend', (e) => this._handleDragEnd(e, card));
            }
        });

        // Set up drop zones
        this.$$('.column-books').forEach(column => {
            column.addEventListener('dragover', (e) => this._handleDragOver(e));
            column.addEventListener('dragenter', (e) => this._handleDragEnter(e, column));
            column.addEventListener('dragleave', (e) => this._handleDragLeave(e, column));
            column.addEventListener('drop', (e) => this._handleDrop(e, column));
        });
    }

    _handleDragStart(e, card) {
        this._draggedCard = card;
        const innerCard = card.shadowRoot?.querySelector('.book-card');
        if (innerCard) {
            innerCard.classList.add('dragging');
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.bookId);
    }

    _handleDragEnd(e, card) {
        const innerCard = card.shadowRoot?.querySelector('.book-card');
        if (innerCard) {
            innerCard.classList.remove('dragging');
        }
        this.$$('.column-books').forEach(col => col.classList.remove('drag-over'));
        this._draggedCard = null;
    }

    _handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    _handleDragEnter(e, column) {
        e.preventDefault();
        column.classList.add('drag-over');
    }

    _handleDragLeave(e, column) {
        if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    }

    async _handleDrop(e, column) {
        e.preventDefault();
        column.classList.remove('drag-over');

        if (!this._draggedCard) return;

        const newStatus = column.dataset.status;
        const oldStatus = this._draggedCard.dataset.status;
        const bookId = this._draggedCard.dataset.bookId;

        if (newStatus === oldStatus) return;

        // Check WIP limit for reading column
        if (newStatus === 'reading') {
            const { wipLimit, pipeline } = this.state;
            const currentReading = pipeline?.reading?.length || 0;
            if (currentReading >= wipLimit) {
                this.emit('toast', {
                    message: `You've reached your WIP limit of ${wipLimit} books. Finish or pause a book before starting a new one.`,
                    type: 'warning'
                });
                return;
            }
        }

        try {
            await api.updateBook(bookId, { status: newStatus });
            await this._loadData();
        } catch (error) {
            console.error('Error updating book status:', error);
            this.emit('toast', { message: 'Failed to update book status', type: 'error' });
        }
    }

    async onConnect() {
        await this._loadData();
    }

    onDisconnect() {
        // Clean up if needed
    }

    async _loadData() {
        this.setState({ loading: true, error: null });

        try {
            const data = await api.getPipeline();
            store.set('pipeline', data);
            this.setState({
                loading: false,
                pipeline: data.pipeline,
                wipLimit: data.wip_limit
            });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load pipeline. Make sure the backend is running.'
            });
            console.error('Pipeline error:', error);
        }
    }

    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-pipeline-view', BtPipelineView);
