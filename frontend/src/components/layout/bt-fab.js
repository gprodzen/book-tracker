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
                border-radius: var(--radius-full, 9999px);
                background: linear-gradient(
                    135deg,
                    var(--accent, #8B4513) 0%,
                    var(--accent-hover, #A0522D) 100%
                );
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow:
                    0 4px 12px rgba(139, 69, 19, 0.3),
                    0 8px 24px rgba(139, 69, 19, 0.15);
                transition:
                    transform var(--duration-normal, 250ms) var(--ease-spring-bouncy, cubic-bezier(0.68, -0.55, 0.265, 1.55)),
                    box-shadow var(--duration-normal, 250ms) var(--ease-out),
                    background var(--duration-fast, 150ms) var(--ease-out);
            }

            .fab:hover {
                transform: scale(1.08);
                box-shadow:
                    0 6px 16px rgba(139, 69, 19, 0.35),
                    0 12px 32px rgba(139, 69, 19, 0.2);
                background: linear-gradient(
                    135deg,
                    var(--accent-hover, #A0522D) 0%,
                    #b35a2d 100%
                );
            }

            .fab:active {
                transform: scale(0.95);
                transition: transform var(--duration-fast, 150ms) var(--ease-out);
                box-shadow:
                    0 2px 8px rgba(139, 69, 19, 0.3),
                    0 4px 12px rgba(139, 69, 19, 0.15);
            }

            .fab:focus {
                outline: none;
                box-shadow:
                    0 0 0 3px rgba(139, 69, 19, 0.3),
                    0 6px 16px rgba(139, 69, 19, 0.35),
                    0 12px 32px rgba(139, 69, 19, 0.2);
            }

            :host([extended]) .fab {
                padding: 0 24px;
                border-radius: var(--radius-2xl, 24px);
            }

            .label {
                font-size: 0.875rem;
                font-weight: 600;
                font-family: var(--font-body, 'IBM Plex Sans', sans-serif);
            }

            /* Mini FAB variant */
            :host([size="mini"]) .fab {
                min-width: 44px;
                height: 44px;
                font-size: 18px;
            }

            :host([size="mini"][extended]) .fab {
                padding: 0 18px;
            }

            /* Secondary color variant */
            :host([color="secondary"]) .fab {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
                box-shadow:
                    0 2px 8px rgba(44, 36, 22, 0.1),
                    0 4px 16px rgba(44, 36, 22, 0.06);
            }

            :host([color="secondary"]) .fab:hover {
                background: var(--bg-tertiary, #EDE6DB);
                box-shadow:
                    0 4px 12px rgba(44, 36, 22, 0.12),
                    0 8px 24px rgba(44, 36, 22, 0.08);
            }

            /* Mobile positioning */
            @media (max-width: 768px) {
                :host {
                    bottom: 16px;
                    right: 16px;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .fab {
                    transition:
                        box-shadow var(--duration-fast, 150ms) var(--ease-out),
                        background var(--duration-fast, 150ms) var(--ease-out);
                }

                .fab:hover,
                .fab:active {
                    transform: none;
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
