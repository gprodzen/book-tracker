/**
 * bt-progress-bar - Reading progress indicator
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtProgressBar extends BaseComponent {
    static get observedAttributes() {
        return ['value', 'max', 'show-text'];
    }

    styles() {
        return `
            :host {
                display: block;
                width: 100%;
            }

            .progress-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .progress-bar {
                background: var(--bg-tertiary, #EDE6DB);
                border-radius: 4px;
                height: 6px;
                overflow: hidden;
                flex: 1;
            }

            .progress-bar-fill {
                background: var(--accent, #8B4513);
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .progress-bar-fill.complete {
                background: var(--green, #2E7D4A);
            }

            .progress-text {
                font-size: 0.75rem;
                color: var(--text-muted, #8B7E6A);
                min-width: 36px;
                text-align: right;
            }

            :host([size="small"]) .progress-bar {
                height: 4px;
            }

            :host([size="large"]) .progress-bar {
                height: 10px;
            }
        `;
    }

    template() {
        const value = parseInt(this.getAttribute('value') || '0');
        const max = parseInt(this.getAttribute('max') || '100');
        const showText = this.hasAttribute('show-text');

        const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
        const isComplete = percent >= 100;

        return `
            <div class="progress-container">
                <div class="progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                </div>
                ${showText ? `<span class="progress-text">${percent}%</span>` : ''}
            </div>
        `;
    }
}

defineComponent('bt-progress-bar', BtProgressBar);
