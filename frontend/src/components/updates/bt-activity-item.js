/**
 * bt-activity-item - Single activity feed item
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtActivityItem extends BaseComponent {
    constructor() {
        super();
        this._update = null;
        this._editValue = '';
        this._editNote = '';
        this.setState({
            editing: false,
            saving: false,
            error: null
        });
    }

    set update(update) {
        this._update = update;
        if (update) {
            this._editValue = update.input_mode === 'page'
                ? (update.current_page ?? '')
                : (update.current_percent ?? '');
            this._editNote = update.note || '';
        }
        if (this._connected) this.render();
    }

    get update() {
        return this._update;
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .item {
                display: grid;
                grid-template-columns: 48px 1fr;
                gap: var(--space-3, 12px);
                padding: var(--space-4, 16px);
                border-radius: var(--radius-lg, 14px);
                border: 1px solid var(--color-border-subtle, #efe9df);
                background: var(--color-surface, #ffffff);
            }

            .cover {
                width: 48px;
                height: 72px;
                border-radius: var(--radius-sm, 6px);
                background: var(--color-bg-tertiary, #fbfaf8);
                border: 1px solid var(--color-border-subtle, #efe9df);
                overflow: hidden;
            }

            .cover img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .header {
                display: flex;
                justify-content: space-between;
                gap: var(--space-3, 12px);
            }

            .title {
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2b2418);
            }

            .author {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-muted, #8a7d6b);
            }

            .time {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
                white-space: nowrap;
            }

            .progress {
                margin-top: var(--space-2, 8px);
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-secondary, #6b6051);
            }

            .note {
                margin-top: var(--space-3, 12px);
                padding: var(--space-3, 12px);
                border-radius: var(--radius-md, 10px);
                background: var(--color-bg-tertiary, #fbfaf8);
                border: 1px solid var(--color-border-subtle, #efe9df);
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-secondary, #6b6051);
                white-space: pre-wrap;
            }

            .label {
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-text-muted, #8a7d6b);
                font-weight: var(--font-medium, 500);
            }

            .actions {
                margin-top: var(--space-3, 12px);
                display: flex;
                gap: var(--space-2, 8px);
            }

            .actions button {
                font-size: var(--text-xs, 0.75rem);
                padding: 6px 10px;
            }

            .edit-panel {
                margin-top: var(--space-3, 12px);
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
            }

            .edit-actions {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-2, 8px);
            }

            .error {
                margin-top: var(--space-2, 8px);
                font-size: var(--text-xs, 0.75rem);
                color: var(--color-error, #c7514d);
            }
        `;
    }

    template() {
        const update = this._update;
        if (!update) return '';

        const { editing, saving, error } = this.state;
        const progressText = this._formatProgress(update);
        const timeText = this._formatTime(update.created_at);

        return `
            <div class="item">
                <div class="cover">
                    ${update.cover_image_url ? `<img src="${update.cover_image_url}" alt="">` : ''}
                </div>
                <div>
                    <div class="header">
                        <div>
                            <div class="title">${this.escapeHtml(update.title)}</div>
                            <div class="author">${this.escapeHtml(update.author)}</div>
                        </div>
                        <div class="time">${timeText}</div>
                    </div>

                    <div class="progress">${this.escapeHtml(progressText)}</div>

                    ${update.note && !editing ? `<div class="note">${this.escapeHtml(update.note)}</div>` : ''}

                    ${editing ? this._renderEditPanel(update, saving) : `
                        <div class="actions">
                            <button class="secondary" ref="editBtn">Edit</button>
                            <button class="danger" ref="deleteBtn">Delete</button>
                        </div>
                    `}

                    ${error ? `<div class="error">${this.escapeHtml(error)}</div>` : ''}
                </div>
            </div>
        `;
    }

    _renderEditPanel(update, saving) {
        const label = update.input_mode === 'page' ? 'Current page' : 'Current percent';
        const maxAttr = update.input_mode === 'percent' ? 'max="100"' : '';
        return `
            <div class="edit-panel">
                <div>
                    <label class="label">${label}</label>
                    <input
                        type="number"
                        ref="editValue"
                        ${maxAttr}
                        value="${this._editValue}"
                    >
                </div>
                <div>
                    <label class="label">Note</label>
                    <textarea ref="editNote">${this.escapeHtml(this._editNote)}</textarea>
                </div>
                <div class="edit-actions">
                    <button class="secondary" type="button" ref="cancelEditBtn">Cancel</button>
                    <button class="primary" type="button" ref="saveEditBtn" ${saving ? 'disabled' : ''}>
                        ${saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        `;
    }

    afterRender() {
        const { editing } = this.state;

        const editBtn = this.ref('editBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.setState({ editing: true, error: null });
            });
        }

        const deleteBtn = this.ref('deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this._handleDelete());
        }

        const cancelEditBtn = this.ref('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.setState({ editing: false, error: null });
            });
        }

        const saveEditBtn = this.ref('saveEditBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', () => this._handleSave());
        }

        if (editing) {
            const editValue = this.ref('editValue');
            if (editValue) {
                editValue.addEventListener('input', () => {
                    this._editValue = editValue.value;
                });
            }
            const editNote = this.ref('editNote');
            if (editNote) {
                editNote.addEventListener('input', () => {
                    this._editNote = editNote.value;
                });
            }
        }
    }

    async _handleSave() {
        const update = this._update;
        if (!update) return;

        const payload = { note: this._editNote };

        if (update.input_mode === 'page') {
            const value = parseInt(this._editValue);
            if (!value || value < 0) {
                this.setState({ error: 'Enter a valid page value.' });
                return;
            }
            payload.current_page = value;
        } else {
            const value = parseInt(this._editValue);
            if (Number.isNaN(value) || value < 0) {
                this.setState({ error: 'Enter a valid percent.' });
                return;
            }
            payload.progress_percent = value;
        }

        this.setState({ saving: true, error: null });

        try {
            await api.updateProgressUpdate(update.book_id, update.id, payload);
            this.setState({ saving: false, editing: false });
            this.emit('update-changed');
        } catch (error) {
            this.setState({ saving: false, error: 'Failed to update.' });
        }
    }

    async _handleDelete() {
        const update = this._update;
        if (!update) return;

        const confirmed = window.confirm('Delete this progress update?');
        if (!confirmed) return;

        try {
            await api.deleteProgressUpdate(update.book_id, update.id);
            this.emit('update-changed');
        } catch (error) {
            this.setState({ error: 'Failed to delete.' });
        }
    }

    _formatProgress(update) {
        const prevPage = update.previous_page;
        const currPage = update.current_page;
        const prevPercent = update.previous_percent;
        const currPercent = update.current_percent;

        if (currPage !== null && currPage !== undefined) {
            let text = '';
            if (prevPage !== null && prevPage !== undefined) {
                text = `${prevPage} -> ${currPage} pages`;
            } else {
                text = `${currPage} pages`;
            }
            if (currPercent !== null && currPercent !== undefined) {
                text += ` (${currPercent}%)`;
            }
            return text;
        }

        if (currPercent !== null && currPercent !== undefined) {
            if (prevPercent !== null && prevPercent !== undefined) {
                return `${prevPercent}% -> ${currPercent}%`;
            }
            return `${currPercent}%`;
        }

        return 'Progress updated';
    }

    _formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

defineComponent('bt-activity-item', BtActivityItem);
