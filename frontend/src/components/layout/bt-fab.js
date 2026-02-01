/**
 * bt-fab - Floating Action Button component
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtFab extends BaseComponent {
    static get observedAttributes() {
        return ['icon', 'label', 'extended'];
    }

    styles() {
        return `
            :host {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: var(--z-dropdown, 100);
            }

            .fab {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-width: 56px;
                height: 56px;
                border-radius: 28px;
                background: var(--accent, #58a6ff);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
            }

            .fab:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
                background: var(--accent-hover, #79b8ff);
            }

            .fab:active {
                transform: scale(0.98);
            }

            .fab:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.3), 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            :host([extended]) .fab {
                padding: 0 20px;
                border-radius: 28px;
            }

            .label {
                font-size: 0.875rem;
                font-weight: 600;
            }

            /* Mini FAB variant */
            :host([size="mini"]) .fab {
                min-width: 40px;
                height: 40px;
                font-size: 18px;
            }

            :host([size="mini"][extended]) .fab {
                padding: 0 16px;
            }

            /* Secondary color variant */
            :host([color="secondary"]) .fab {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                color: var(--text, #c9d1d9);
            }

            :host([color="secondary"]) .fab:hover {
                background: var(--bg-tertiary, #21262d);
            }

            /* Mobile positioning */
            @media (max-width: 768px) {
                :host {
                    bottom: 16px;
                    right: 16px;
                }
            }
        `;
    }

    template() {
        const icon = this.getAttribute('icon') || '+';
        const label = this.getAttribute('label') || '';
        const extended = this.hasAttribute('extended');
        const ariaLabel = this.getAttribute('aria-label') || label || 'Action button';

        return `
            <button class="fab" aria-label="${this.escapeHtml(ariaLabel)}">
                <span class="icon">${icon}</span>
                ${extended && label ? `<span class="label">${this.escapeHtml(label)}</span>` : ''}
            </button>
        `;
    }

    afterRender() {
        const fab = this.$('.fab');
        if (fab) {
            fab.addEventListener('click', () => {
                this.emit('click');
            });
        }
    }
}

defineComponent('bt-fab', BtFab);
