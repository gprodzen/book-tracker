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
                background: rgba(46, 125, 74, 0.15);
                color: var(--green, #2E7D4A);
            }

            .status-reading {
                background: rgba(139, 69, 19, 0.15);
                color: var(--accent, #8B4513);
            }

            .status-queued {
                background: rgba(46, 125, 74, 0.15);
                color: var(--purple, #2E7D4A);
            }

            .status-owned {
                background: rgba(184, 134, 11, 0.15);
                color: var(--yellow, #B8860B);
            }

            .status-interested {
                background: rgba(123, 92, 158, 0.15);
                color: var(--text-muted, #7B5C9E);
            }

            .status-abandoned {
                background: rgba(160, 82, 45, 0.15);
                color: var(--red, #A0522D);
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
