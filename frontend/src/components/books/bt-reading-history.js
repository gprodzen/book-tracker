/**
 * bt-reading-history - Timeline display of reading sessions
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtReadingHistory extends BaseComponent {
    constructor() {
        super();
        this.setState({
            bookId: null,
            sessions: [],
            loading: false,
            error: null,
            editingId: null,
            editPages: '',
            editNotes: '',
            deleteConfirmId: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .history-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-muted, #8B7E6A);
            }

            .session-count {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            .sessions-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .session-item {
                background: var(--bg-secondary, #F5F0E8);
                border-radius: 8px;
                padding: 12px 16px;
                position: relative;
            }

            .session-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--accent, #8B4513);
                border-radius: 3px 0 0 3px;
            }

            .session-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 4px;
            }

            .session-date {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
            }

            .session-actions {
                display: flex;
                gap: 8px;
            }

            .session-actions button {
                background: none;
                border: none;
                padding: 2px 6px;
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
                cursor: pointer;
                border-radius: 4px;
            }

            .session-actions button:hover {
                background: var(--bg-tertiary, #EDE6DB);
                color: var(--text, #2C2416);
            }

            .session-actions button.delete:hover {
                color: var(--color-error, #dc2626);
            }

            .session-pages {
                font-weight: 600;
                color: var(--text, #2C2416);
                font-size: 0.875rem;
            }

            .session-notes {
                margin-top: 8px;
                font-size: 0.8125rem;
                color: var(--text-secondary, #5C5244);
                line-height: 1.5;
                padding-top: 8px;
                border-top: 1px solid var(--border-subtle, #E5DED2);
            }

            .empty-state {
                text-align: center;
                padding: 24px;
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
            }

            .loading {
                text-align: center;
                padding: 16px;
                color: var(--text-muted, #8B7E6A);
                font-size: 0.875rem;
            }

            /* Edit form */
            .edit-form {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .edit-form input,
            .edit-form textarea {
                padding: 8px 12px;
                background: var(--surface, #FFFFFF);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                font-size: 0.875rem;
                font-family: inherit;
            }

            .edit-form input:focus,
            .edit-form textarea:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            .edit-form textarea {
                min-height: 60px;
                resize: vertical;
            }

            .edit-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .edit-actions button {
                padding: 6px 12px;
                font-size: 0.75rem;
                border-radius: 4px;
                cursor: pointer;
            }

            .edit-actions .cancel-btn {
                background: var(--bg-tertiary, #EDE6DB);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
            }

            .edit-actions .save-btn {
                background: var(--accent, #8B4513);
                border: 1px solid var(--accent, #8B4513);
                color: white;
            }

            /* Delete confirmation */
            .delete-confirm {
                background: rgba(220, 38, 38, 0.1);
                padding: 10px;
                border-radius: 6px;
                margin-top: 8px;
            }

            .delete-confirm p {
                font-size: 0.8125rem;
                color: var(--color-error, #dc2626);
                margin-bottom: 8px;
            }

            .delete-confirm button {
                padding: 6px 12px;
                font-size: 0.75rem;
                border-radius: 4px;
                cursor: pointer;
            }

            .delete-confirm .confirm-btn {
                background: var(--color-error, #dc2626);
                border: none;
                color: white;
                margin-right: 8px;
            }

            .delete-confirm .cancel-btn {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
            }
        `;
    }

    template() {
        const { sessions, loading, error, editingId, deleteConfirmId } = this.state;

        if (loading) {
            return '<div class="loading">Loading history...</div>';
        }

        if (error) {
            return `<div class="error">${this.escapeHtml(error)}</div>`;
        }

        if (!sessions.length) {
            return '<div class="empty-state">No reading sessions yet. Check in to start tracking!</div>';
        }

        return `
            <div class="history-header">
                <span class="history-title">Reading History</span>
                <span class="session-count">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="sessions-list">
                ${sessions.map(session => this._renderSession(session, editingId, deleteConfirmId)).join('')}
            </div>
        `;
    }

    _renderSession(session, editingId, deleteConfirmId) {
        const isEditing = editingId === session.id;
        const isDeleting = deleteConfirmId === session.id;
        const date = session.finished_at ? new Date(session.finished_at) : new Date(session.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        if (isEditing) {
            return `
                <div class="session-item" data-session-id="${session.id}">
                    <div class="edit-form">
                        <input type="number" ref="editPagesInput" value="${session.pages_read}" min="1" placeholder="Pages read">
                        <textarea ref="editNotesInput" placeholder="Notes (optional)">${session.notes || ''}</textarea>
                        <div class="edit-actions">
                            <button class="cancel-btn" data-action="cancel-edit">Cancel</button>
                            <button class="save-btn" data-action="save-edit" data-session-id="${session.id}">Save</button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-header">
                    <span class="session-date">${formattedDate}</span>
                    <div class="session-actions">
                        <button data-action="edit" data-session-id="${session.id}">Edit</button>
                        <button class="delete" data-action="delete" data-session-id="${session.id}">Delete</button>
                    </div>
                </div>
                <div class="session-pages">${session.pages_read} pages</div>
                ${session.notes ? `<div class="session-notes">${this.escapeHtml(session.notes)}</div>` : ''}
                ${isDeleting ? `
                    <div class="delete-confirm">
                        <p>Delete this session? Progress will be recalculated.</p>
                        <button class="confirm-btn" data-action="confirm-delete" data-session-id="${session.id}">Delete</button>
                        <button class="cancel-btn" data-action="cancel-delete">Cancel</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    afterRender() {
        // Edit actions
        this.$$('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sessionId = parseInt(btn.dataset.sessionId);
                const session = this.state.sessions.find(s => s.id === sessionId);
                if (session) {
                    this.setState({
                        editingId: sessionId,
                        editPages: session.pages_read.toString(),
                        editNotes: session.notes || '',
                        deleteConfirmId: null
                    });
                }
            });
        });

        this.$$('[data-action="cancel-edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ editingId: null });
            });
        });

        this.$$('[data-action="save-edit"]').forEach(btn => {
            btn.addEventListener('click', () => this._handleSaveEdit(parseInt(btn.dataset.sessionId)));
        });

        // Delete actions
        this.$$('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({
                    deleteConfirmId: parseInt(btn.dataset.sessionId),
                    editingId: null
                });
            });
        });

        this.$$('[data-action="cancel-delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ deleteConfirmId: null });
            });
        });

        this.$$('[data-action="confirm-delete"]').forEach(btn => {
            btn.addEventListener('click', () => this._handleDelete(parseInt(btn.dataset.sessionId)));
        });

        // Store refs for edit form inputs
        const editPagesInput = this.ref('editPagesInput');
        const editNotesInput = this.ref('editNotesInput');

        if (editPagesInput) {
            editPagesInput.addEventListener('input', () => {
                this.state.editPages = editPagesInput.value;
            });
        }

        if (editNotesInput) {
            editNotesInput.addEventListener('input', () => {
                this.state.editNotes = editNotesInput.value;
            });
        }
    }

    async _handleSaveEdit(sessionId) {
        const { bookId, editPages, editNotes } = this.state;
        const pagesRead = parseInt(editPages) || 0;

        if (pagesRead <= 0) return;

        try {
            await api.updateSession(bookId, sessionId, {
                pages_read: pagesRead,
                notes: editNotes.trim() || null
            });

            // Refresh sessions
            await this._loadSessions();
            this.setState({ editingId: null });
            this.emit('session-updated');
        } catch (error) {
            console.error('Error updating session:', error);
            this.emit('toast', { message: 'Failed to update session', type: 'error' });
        }
    }

    async _handleDelete(sessionId) {
        const { bookId } = this.state;

        try {
            await api.deleteSession(bookId, sessionId);

            // Refresh sessions
            await this._loadSessions();
            this.setState({ deleteConfirmId: null });
            this.emit('session-deleted');
        } catch (error) {
            console.error('Error deleting session:', error);
            this.emit('toast', { message: 'Failed to delete session', type: 'error' });
        }
    }

    async _loadSessions() {
        const { bookId } = this.state;
        if (!bookId) return;

        this.setState({ loading: true, error: null });

        try {
            const sessions = await api.getSessions(bookId);
            this.setState({ loading: false, sessions });
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.setState({
                loading: false,
                error: 'Failed to load reading history'
            });
        }
    }

    /**
     * Set the book ID and load sessions
     */
    set bookId(id) {
        this.setState({ bookId: id });
        this._loadSessions();
    }

    /**
     * Refresh the sessions list
     */
    async refresh() {
        await this._loadSessions();
    }
}

defineComponent('bt-reading-history', BtReadingHistory);
