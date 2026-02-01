/**
 * bt-empty-state - Empty list messaging component
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtEmptyState extends BaseComponent {
    static get observedAttributes() {
        return ['icon', 'title', 'description'];
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-muted, #8B7E6A);
            }

            .icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .title {
                font-size: 1rem;
                color: var(--text, #2C2416);
                margin-bottom: 8px;
                font-weight: 600;
            }

            .description {
                font-size: 0.875rem;
                margin-bottom: 20px;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
            }

            .actions {
                margin-top: 16px;
            }

            ::slotted(button) {
                margin: 4px;
            }
        `;
    }

    template() {
        const icon = this.getAttribute('icon') || '';
        const title = this.getAttribute('title') || 'No items found';
        const description = this.getAttribute('description') || '';

        return `
            <div class="empty-state">
                ${icon ? `<div class="icon">${icon}</div>` : ''}
                <div class="title">${this.escapeHtml(title)}</div>
                ${description ? `<p class="description">${this.escapeHtml(description)}</p>` : ''}
                <div class="actions">
                    <slot></slot>
                </div>
            </div>
        `;
    }
}

defineComponent('bt-empty-state', BtEmptyState);
