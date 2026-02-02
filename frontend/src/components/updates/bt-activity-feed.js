/**
 * bt-activity-feed - Recent progress updates list
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';
import { events, EVENT_NAMES } from '../../core/events.js';
import './bt-activity-item.js';
import '../shared/bt-empty-state.js';

export class BtActivityFeed extends BaseComponent {
    static get observedAttributes() {
        return ['limit'];
    }

    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            updates: []
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .feed {
                display: flex;
                flex-direction: column;
                gap: var(--space-3, 12px);
            }

            .empty {
                padding: var(--space-6, 24px);
                border-radius: var(--radius-lg, 14px);
                border: 1px solid var(--color-border-subtle, #efe9df);
                background: var(--color-surface, #ffffff);
                color: var(--color-text-muted, #8a7d6b);
                font-size: var(--text-sm, 0.875rem);
                text-align: center;
            }
        `;
    }

    template() {
        const { loading, error, updates } = this.state;

        if (loading) {
            return '<div class="empty">Loading activity...</div>';
        }

        if (error) {
            return `<div class="empty">${this.escapeHtml(error)}</div>`;
        }

        if (!updates || updates.length === 0) {
            return '<div class="empty">No recent updates yet.</div>';
        }

        return `
            <div class="feed">
                ${updates.map(update => `
                    <bt-activity-item data-update-id="${update.id}"></bt-activity-item>
                `).join('')}
            </div>
        `;
    }

    afterRender() {
        const { updates } = this.state;
        if (!updates || updates.length === 0) return;

        updates.forEach(update => {
            const item = this.$(`bt-activity-item[data-update-id="${update.id}"]`);
            if (item) {
                item.update = update;
                item.addEventListener('update-changed', () => this.refresh());
            }
        });
    }

    async onConnect() {
        await this._load();
        this._unsubBookUpdated = events.on(EVENT_NAMES.BOOK_UPDATED, () => this.refresh());
    }

    onDisconnect() {
        if (this._unsubBookUpdated) this._unsubBookUpdated();
    }

    async _load() {
        this.setState({ loading: true, error: null });
        const limit = parseInt(this.getAttribute('limit')) || 20;

        try {
            const data = await api.getActivity({ limit });
            this.setState({ loading: false, updates: data.updates || [] });
        } catch (error) {
            this.setState({ loading: false, error: 'Failed to load activity.' });
        }
    }

    async refresh() {
        await this._load();
    }
}

defineComponent('bt-activity-feed', BtActivityFeed);
