/**
 * bt-loading - Loading spinner and skeleton states
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtLoading extends BaseComponent {
    static get observedAttributes() {
        return ['type', 'text'];
    }

    styles() {
        return `
            :host {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: var(--text-muted, #8b949e);
            }

            .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--bg-tertiary, #21262d);
                border-top-color: var(--accent, #58a6ff);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            .spinner.small {
                width: 16px;
                height: 16px;
                border-width: 2px;
            }

            .spinner.large {
                width: 32px;
                height: 32px;
                border-width: 3px;
            }

            .text {
                margin-left: 12px;
                font-size: 0.875rem;
            }

            /* Skeleton styles */
            .skeleton {
                background: linear-gradient(
                    90deg,
                    var(--bg-tertiary, #21262d) 25%,
                    var(--bg-secondary, #161b22) 50%,
                    var(--bg-tertiary, #21262d) 75%
                );
                background-size: 200% 100%;
                animation: skeleton 1.5s infinite;
                border-radius: 4px;
            }

            .skeleton-card {
                width: 100%;
            }

            .skeleton-cover {
                aspect-ratio: 2/3;
                border-radius: 8px 8px 0 0;
            }

            .skeleton-info {
                padding: 12px;
            }

            .skeleton-text {
                height: 14px;
                margin-bottom: 8px;
            }

            .skeleton-text:last-child {
                width: 70%;
            }

            .skeleton-text-short {
                width: 50%;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes skeleton {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
    }

    template() {
        const type = this.getAttribute('type') || 'spinner';
        const text = this.getAttribute('text') || '';
        const size = this.getAttribute('size') || 'medium';

        if (type === 'skeleton') {
            return this._renderSkeleton();
        }

        if (type === 'skeleton-card') {
            return this._renderSkeletonCard();
        }

        return `
            <div class="loading">
                <div class="spinner ${size}"></div>
                ${text ? `<span class="text">${this.escapeHtml(text)}</span>` : ''}
            </div>
        `;
    }

    _renderSkeleton() {
        const lines = parseInt(this.getAttribute('lines') || '3');
        return `
            <div class="skeleton-content">
                ${Array(lines).fill(0).map((_, i) =>
                    `<div class="skeleton skeleton-text ${i === lines - 1 ? 'skeleton-text-short' : ''}"></div>`
                ).join('')}
            </div>
        `;
    }

    _renderSkeletonCard() {
        return `
            <div class="skeleton-card">
                <div class="skeleton skeleton-cover"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text skeleton-text-short"></div>
                </div>
            </div>
        `;
    }
}

defineComponent('bt-loading', BtLoading);
