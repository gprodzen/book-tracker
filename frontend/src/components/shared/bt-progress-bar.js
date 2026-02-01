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
                border-radius: var(--radius-full, 9999px);
                height: 6px;
                overflow: hidden;
                flex: 1;
                position: relative;
            }

            .progress-bar-fill {
                background: linear-gradient(
                    90deg,
                    var(--accent, #8B4513) 0%,
                    var(--accent-hover, #A0522D) 100%
                );
                height: 100%;
                border-radius: var(--radius-full, 9999px);
                transition: width var(--duration-slow, 350ms) var(--ease-spring-soft, cubic-bezier(0.34, 1.56, 0.64, 1));
                position: relative;
                box-shadow: 0 1px 4px rgba(139, 69, 19, 0.2);
            }

            /* Subtle glow effect on fill */
            .progress-bar-fill::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 20px;
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(255, 255, 255, 0.3) 100%
                );
                border-radius: var(--radius-full, 9999px);
            }

            .progress-bar-fill.complete {
                background: linear-gradient(
                    90deg,
                    var(--green, #2E7D4A) 0%,
                    #3d9960 100%
                );
                box-shadow: 0 1px 4px rgba(46, 125, 74, 0.25);
            }

            .progress-text {
                font-size: 0.75rem;
                font-family: var(--font-mono);
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

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .progress-bar-fill {
                    transition: width var(--duration-fast, 150ms) var(--ease-out);
                }
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
