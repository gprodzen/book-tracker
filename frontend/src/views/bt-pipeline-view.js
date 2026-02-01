/**
 * bt-pipeline-view - Kanban-style pipeline view with drag-and-drop
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

            .pipeline {
                display: flex;
                gap: 16px;
                overflow-x: auto;
                padding-bottom: 16px;
                min-height: calc(100vh - 180px);
            }

            .pipeline::-webkit-scrollbar {
                height: 8px;
            }

            .pipeline::-webkit-scrollbar-track {
                background: var(--bg, #0d1117);
            }

            .pipeline::-webkit-scrollbar-thumb {
                background: var(--bg-tertiary, #21262d);
                border-radius: 4px;
            }

            .column {
                flex: 0 0 280px;
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 180px);
            }

            .column-header {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border, #30363d);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                background: var(--bg-secondary, #161b22);
                border-radius: 8px 8px 0 0;
            }

            .column-title {
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                color: var(--text-muted, #8b949e);
            }

            .column-subtitle {
                font-size: 0.65rem;
                color: var(--text-muted, #8b949e);
                display: block;
            }

            .column-count {
                font-size: 0.75rem;
                padding: 2px 8px;
                border-radius: 10px;
                background: var(--bg-tertiary, #21262d);
                color: var(--text-muted, #8b949e);
            }

            .column-count.warning {
                background: rgba(210, 153, 34, 0.2);
                color: var(--yellow, #d29922);
            }

            .column-count.over {
                background: rgba(248, 81, 73, 0.2);
                color: var(--red, #f85149);
            }

            .column-books {
                padding: 12px;
                overflow-y: auto;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .column-books.drag-over {
                background: rgba(88, 166, 255, 0.05);
            }

            bt-book-card {
                display: block;
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
            { key: 'interested', title: 'Interested', subtitle: 'wishlist' },
            { key: 'owned', title: 'Owned', subtitle: 'purchased' },
            { key: 'queued', title: 'Queued', subtitle: 'up next' },
            { key: 'reading', title: 'Reading', subtitle: `${readingCount}/${wipLimit}`, isWip: true },
            { key: 'finished', title: 'Finished', subtitle: '' }
        ];

        return `
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

        return `
            <div class="column" data-status="${col.key}">
                <div class="column-header">
                    <div>
                        <span class="column-title">${col.title}</span>
                        ${col.subtitle ? `<span class="column-subtitle">${col.subtitle}</span>` : ''}
                    </div>
                    <span class="column-count ${countClass}">${count}</span>
                </div>
                <div class="column-books" data-status="${col.key}">
                    ${books.map(book => `
                        <bt-book-card
                            variant="pipeline"
                            data-book-id="${book.book_id}"
                            data-user-book-id="${book.user_book_id}"
                            data-status="${book.status}"
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
            ...(pipeline.interested || []),
            ...(pipeline.owned || []),
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

        // Subscribe to updates
        this._unsubPipeline = events.on(EVENT_NAMES.PIPELINE_LOADED, () => {
            this._loadData();
        });

        this._unsubBookUpdated = events.on(EVENT_NAMES.BOOK_UPDATED, () => {
            this._loadData();
        });
    }

    onDisconnect() {
        if (this._unsubPipeline) this._unsubPipeline();
        if (this._unsubBookUpdated) this._unsubBookUpdated();
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
