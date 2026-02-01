/**
 * bt-status-badge - Status pill component
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtStatusBadge extends BaseComponent {
    static get observedAttributes() {
        return ['status'];
    }

    styles() {
        return `
            :host {
                display: inline-block;
            }

            .badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.625rem;
                text-transform: uppercase;
                font-weight: 600;
                display: inline-block;
                letter-spacing: 0.025em;
            }

            .status-finished {
                background: rgba(63, 185, 80, 0.2);
                color: var(--green, #3fb950);
            }

            .status-reading {
                background: rgba(88, 166, 255, 0.2);
                color: var(--accent, #58a6ff);
            }

            .status-queued {
                background: rgba(163, 113, 247, 0.2);
                color: var(--purple, #a371f7);
            }

            .status-owned {
                background: rgba(210, 153, 34, 0.2);
                color: var(--yellow, #d29922);
            }

            .status-interested {
                background: rgba(139, 148, 158, 0.2);
                color: var(--text-muted, #8b949e);
            }

            .status-abandoned {
                background: rgba(248, 81, 73, 0.2);
                color: var(--red, #f85149);
            }
        `;
    }

    template() {
        const status = this.getAttribute('status') || 'interested';
        const label = this.formatStatus(status);

        return `
            <span class="badge status-${status}">${label}</span>
        `;
    }
}

defineComponent('bt-status-badge', BtStatusBadge);
