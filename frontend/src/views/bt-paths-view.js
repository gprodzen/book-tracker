/**
 * bt-paths-view - Learning paths view with nested interactions
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { events, EVENT_NAMES } from '../core/events.js';
import '../components/shared/bt-loading.js';
import '../components/shared/bt-empty-state.js';
import '../components/shared/bt-progress-bar.js';

export class BtPathsView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            paths: [],
            expandedPaths: new Set()
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            h1 {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text, #2C2416);
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

            button.primary {
                background: var(--accent, #8B4513);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #A0522D);
            }

            button.danger {
                color: var(--red, #A0522D);
            }

            button.danger:hover {
                background: rgba(160, 82, 45, 0.1);
            }

            button.small {
                padding: 4px 10px;
                font-size: 0.75rem;
            }

            .paths-list {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .path-item {
                background: var(--surface, #FFFFFF);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 12px;
                overflow: hidden;
            }

            .path-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px;
                background: var(--bg-secondary, #F5F0E8);
                border-bottom: 1px solid var(--border-subtle, #E5DED2);
            }

            .path-title {
                font-size: 1.1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .path-icon {
                width: 12px;
                height: 12px;
                border-radius: 2px;
            }

            .path-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .path-progress-text {
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            .path-objective {
                font-size: 0.9rem;
                color: var(--accent, #8B4513);
                padding: 12px 20px;
                background: rgba(139, 69, 19, 0.06);
                border-left: 3px solid var(--accent, #8B4513);
            }

            /* Two-section layout */
            .path-sections {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1px;
                background: var(--border-subtle, #E5DED2);
            }

            .path-section {
                background: var(--surface, #FFFFFF);
                padding: 16px 20px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .section-title {
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-muted, #8B7E6A);
            }

            .section-count {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
                font-family: var(--font-mono, monospace);
            }

            /* Reading progression - numbered, draggable */
            .progression-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 60px;
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .progression-list.drag-over {
                background: rgba(139, 69, 19, 0.05);
                border-radius: 6px;
            }

            .progression-book {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border-subtle, #E5DED2);
                border-radius: 6px;
                cursor: grab;
                transition: all 0.15s ease-out;
            }

            .progression-book:hover {
                border-color: var(--accent, #8B4513);
            }

            .progression-book.dragging {
                opacity: 0.5;
                transform: scale(0.98);
            }

            .book-number {
                width: 24px;
                height: 24px;
                background: var(--accent, #8B4513);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: 600;
                flex-shrink: 0;
            }

            .book-number.completed {
                background: var(--green, #2E7D4A);
            }

            .book-number.reading {
                background: var(--accent, #8B4513);
            }

            .book-number.pending {
                background: var(--text-muted, #8B7E6A);
            }

            .book-info {
                flex: 1;
                min-width: 0;
            }

            .book-title {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text, #2C2416);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .book-meta {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            .book-status-icon {
                font-size: 0.875rem;
            }

            .book-remove {
                opacity: 0;
                padding: 4px;
                background: transparent;
                border: none;
                color: var(--text-muted, #8B7E6A);
                cursor: pointer;
                font-size: 1rem;
                line-height: 1;
            }

            .progression-book:hover .book-remove {
                opacity: 1;
            }

            .book-remove:hover {
                color: var(--red, #A0522D);
            }

            /* Backlog - unordered */
            .backlog-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 60px;
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .backlog-list.drag-over {
                background: rgba(139, 69, 19, 0.05);
                border-radius: 6px;
            }

            .backlog-book {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border-subtle, #E5DED2);
                border-radius: 6px;
                cursor: grab;
                transition: all 0.15s ease-out;
            }

            .backlog-book:hover {
                border-color: var(--accent, #8B4513);
            }

            .backlog-book.dragging {
                opacity: 0.5;
            }

            .empty-section {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
                border: 2px dashed var(--border-subtle, #E5DED2);
                border-radius: 6px;
            }

            .path-footer {
                padding: 12px 20px;
                border-top: 1px solid var(--border-subtle, #E5DED2);
                background: var(--bg-secondary, #F5F0E8);
            }

            @media (max-width: 768px) {
                .path-header {
                    flex-direction: column;
                    gap: 12px;
                }

                .path-sections {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }

    template() {
        const { loading, error, paths } = this.state;

        if (loading) {
            return '<bt-loading text="Loading learning paths..."></bt-loading>';
        }

        if (error) {
            return `
                <bt-empty-state
                    title="Failed to load learning paths"
                    description="${this.escapeHtml(error)}"
                >
                    <button onclick="location.reload()">Try Again</button>
                </bt-empty-state>
            `;
        }

        return `
            <div class="header">
                <h1>Learning Paths</h1>
                <button class="primary" ref="createPathBtn">+ New Path</button>
            </div>

            ${paths.length > 0 ? `
                <div class="paths-list">
                    ${paths.map(path => this._renderPathItem(path)).join('')}
                </div>
            ` : `
                <bt-empty-state
                    title="No learning paths yet"
                    description="Create learning paths to organize your reading around topics or goals."
                >
                    <button class="primary" ref="createFirstPathBtn">Create Your First Path</button>
                </bt-empty-state>
            `}
        `;
    }

    _renderPathItem(path) {
        const total = path.total_books || 0;
        const completed = path.completed_books || 0;
        const books = path.books || [];

        // Split books into progression (position > 0) and backlog (position = 0 or null)
        const progressionBooks = books.filter(b => b.position && b.position > 0).sort((a, b) => a.position - b.position);
        const backlogBooks = books.filter(b => !b.position || b.position === 0);

        return `
            <div class="path-item" data-path-id="${path.id}">
                <div class="path-header">
                    <div class="path-title">
                        <span class="path-icon" style="background: ${path.color}"></span>
                        ${this.escapeHtml(path.name)}
                    </div>
                    <div class="path-actions">
                        <span class="path-progress-text">${completed}/${total} complete</span>
                        <button data-action="edit" data-path-id="${path.id}">Edit</button>
                        <button class="danger small" data-action="delete" data-path-id="${path.id}">Delete</button>
                    </div>
                </div>

                ${path.objective ? `
                    <div class="path-objective">${this.escapeHtml(path.objective)}</div>
                ` : ''}

                <div class="path-sections">
                    <section class="path-section">
                        <div class="section-header">
                            <span class="section-title">Reading Order</span>
                            <span class="section-count">${progressionBooks.length} books</span>
                        </div>
                        ${progressionBooks.length > 0 ? `
                            <ol class="progression-list" data-path-id="${path.id}" data-droppable="progression">
                                ${progressionBooks.map((book, index) => this._renderProgressionBook(book, index + 1, path.id)).join('')}
                            </ol>
                        ` : `
                            <div class="progression-list empty-section" data-path-id="${path.id}" data-droppable="progression">
                                Drag books here to set reading order
                            </div>
                        `}
                    </section>

                    <section class="path-section">
                        <div class="section-header">
                            <span class="section-title">Backlog</span>
                            <span class="section-count">${backlogBooks.length} books</span>
                        </div>
                        ${backlogBooks.length > 0 ? `
                            <ul class="backlog-list" data-path-id="${path.id}" data-droppable="backlog">
                                ${backlogBooks.map(book => this._renderBacklogBook(book, path.id)).join('')}
                            </ul>
                        ` : `
                            <div class="backlog-list empty-section" data-path-id="${path.id}" data-droppable="backlog">
                                No backlog books
                            </div>
                        `}
                    </section>
                </div>

                <div class="path-footer">
                    <button data-action="add-book" data-path-id="${path.id}">+ Add Book</button>
                </div>
            </div>
        `;
    }

    _renderProgressionBook(book, number, pathId) {
        let statusClass = 'pending';
        let statusIcon = '';
        if (book.status === 'finished') {
            statusClass = 'completed';
            statusIcon = '&#10003;';
        } else if (book.status === 'reading') {
            statusClass = 'reading';
            statusIcon = '&#9658;';
        }

        const progressText = book.status === 'reading' ? `${book.progress_percent || 0}%` : book.status;

        return `
            <li class="progression-book"
                draggable="true"
                data-user-book-id="${book.user_book_id}"
                data-book-id="${book.book_id}"
                data-position="${book.position}">
                <span class="book-number ${statusClass}">${statusIcon || number}</span>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-meta">${this.escapeHtml(book.author || '')} &middot; ${progressText}</div>
                </div>
                <button class="book-remove" data-action="remove-book" data-path-id="${pathId}" data-user-book-id="${book.user_book_id}" title="Remove from path">&times;</button>
            </li>
        `;
    }

    _renderBacklogBook(book, pathId) {
        const progressText = book.status === 'reading' ? `${book.progress_percent || 0}%` : book.status;

        return `
            <li class="backlog-book"
                draggable="true"
                data-user-book-id="${book.user_book_id}"
                data-book-id="${book.book_id}">
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-meta">${this.escapeHtml(book.author || '')} &middot; ${progressText}</div>
                </div>
                <button class="book-remove" data-action="remove-book" data-path-id="${pathId}" data-user-book-id="${book.user_book_id}" title="Remove from path">&times;</button>
            </li>
        `;
    }

    afterRender() {
        // Create path button
        const createPathBtn = this.ref('createPathBtn');
        if (createPathBtn) {
            createPathBtn.addEventListener('click', () => this.emit('create-path'));
        }

        const createFirstPathBtn = this.ref('createFirstPathBtn');
        if (createFirstPathBtn) {
            createFirstPathBtn.addEventListener('click', () => this.emit('create-path'));
        }

        // Path action buttons
        this.$$('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const pathId = parseInt(btn.dataset.pathId);
                const userBookId = btn.dataset.userBookId ? parseInt(btn.dataset.userBookId) : null;

                switch (action) {
                    case 'edit':
                        this.emit('edit-path', { pathId });
                        break;
                    case 'delete':
                        this._handleDeletePath(pathId);
                        break;
                    case 'add-book':
                        this.emit('add-book-to-path', { pathId });
                        break;
                    case 'remove-book':
                        this._handleRemoveBook(pathId, userBookId);
                        break;
                }
            });
        });

        // Book clicks (on book info, not remove button)
        this.$$('.book-info').forEach(bookInfo => {
            bookInfo.addEventListener('click', () => {
                const bookItem = bookInfo.closest('.progression-book, .backlog-book');
                if (bookItem) {
                    const bookId = parseInt(bookItem.dataset.bookId);
                    this.emit('show-book-detail', { bookId });
                }
            });
        });

        // Setup drag and drop
        this._setupDragAndDrop();
    }

    _setupDragAndDrop() {
        // Draggable books
        this.$$('.progression-book, .backlog-book').forEach(book => {
            book.addEventListener('dragstart', (e) => this._handleDragStart(e, book));
            book.addEventListener('dragend', (e) => this._handleDragEnd(e, book));
        });

        // Drop zones
        this.$$('[data-droppable]').forEach(zone => {
            zone.addEventListener('dragover', (e) => this._handleDragOver(e));
            zone.addEventListener('dragenter', (e) => this._handleDragEnter(e, zone));
            zone.addEventListener('dragleave', (e) => this._handleDragLeave(e, zone));
            zone.addEventListener('drop', (e) => this._handleDrop(e, zone));
        });
    }

    _handleDragStart(e, book) {
        this._draggedBook = book;
        book.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', book.dataset.userBookId);
    }

    _handleDragEnd(e, book) {
        book.classList.remove('dragging');
        this.$$('[data-droppable]').forEach(zone => zone.classList.remove('drag-over'));
        this._draggedBook = null;
    }

    _handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    _handleDragEnter(e, zone) {
        e.preventDefault();
        zone.classList.add('drag-over');
    }

    _handleDragLeave(e, zone) {
        if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove('drag-over');
        }
    }

    async _handleDrop(e, zone) {
        e.preventDefault();
        zone.classList.remove('drag-over');

        if (!this._draggedBook) return;

        const pathId = parseInt(zone.dataset.pathId);
        const dropType = zone.dataset.droppable; // 'progression' or 'backlog'
        const userBookId = parseInt(this._draggedBook.dataset.userBookId);

        // Get current path from state
        const path = this.state.paths.find(p => p.id === pathId);
        if (!path) return;

        // Calculate new positions
        const books = path.books || [];
        const progressionBooks = books.filter(b => b.position && b.position > 0).sort((a, b) => a.position - b.position);

        let newOrder;
        if (dropType === 'progression') {
            // Add to progression - append at end with next position
            const maxPosition = progressionBooks.length > 0 ? Math.max(...progressionBooks.map(b => b.position)) : 0;

            // Build new order including the moved book
            newOrder = progressionBooks
                .filter(b => b.user_book_id !== userBookId)
                .map((b, i) => ({ user_book_id: b.user_book_id, position: i + 1 }));

            // Add the dropped book at the end
            newOrder.push({ user_book_id: userBookId, position: newOrder.length + 1 });
        } else {
            // Move to backlog - set position to 0
            newOrder = progressionBooks
                .filter(b => b.user_book_id !== userBookId)
                .map((b, i) => ({ user_book_id: b.user_book_id, position: i + 1 }));

            // Add the moved book to backlog (position 0)
            newOrder.push({ user_book_id: userBookId, position: 0 });
        }

        try {
            await api.reorderPathBooks(pathId, newOrder);
            await this._loadData();
        } catch (error) {
            console.error('Error reordering books:', error);
            this.emit('toast', { message: 'Failed to reorder books', type: 'error' });
        }
    }

    async _handleRemoveBook(pathId, userBookId) {
        try {
            await api.removeBookFromPath(pathId, userBookId);
            await this._loadData();
            this.emit('toast', { message: 'Book removed from path', type: 'success' });
        } catch (error) {
            console.error('Error removing book:', error);
            this.emit('toast', { message: 'Failed to remove book', type: 'error' });
        }
    }

    async _handleDeletePath(pathId) {
        if (!confirm('Are you sure you want to delete this learning path? This will not delete the books, just the path.')) {
            return;
        }

        try {
            await api.deletePath(pathId);
            await this._loadData();
            this.emit('toast', { message: 'Path deleted', type: 'success' });
        } catch (error) {
            console.error('Error deleting path:', error);
            this.emit('toast', { message: 'Failed to delete path', type: 'error' });
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
            const paths = await api.getPaths();

            // Load full details for each path
            const pathsWithDetails = await Promise.all(
                paths.map(async (path) => {
                    try {
                        return await api.getPath(path.id);
                    } catch (e) {
                        return { ...path, books: [] };
                    }
                })
            );

            store.set('paths', pathsWithDetails);
            this.setState({ loading: false, paths: pathsWithDetails });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load learning paths. Make sure the backend is running.'
            });
            console.error('Paths error:', error);
        }
    }

    async refresh() {
        await this._loadData();
    }
}

defineComponent('bt-paths-view', BtPathsView);
