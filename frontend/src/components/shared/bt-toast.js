/**
 * bt-toast - Toast notification component
 *
 * Polished with left accent border by type, slide-in animation, and improved styling.
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { events, EVENT_NAMES } from '../../core/events.js';

export class BtToast extends BaseComponent {
    constructor() {
        super();
        this._queue = [];
        this._current = null;
        this._timeout = null;
    }

    styles() {
        return `
            :host {
                position: fixed;
                bottom: var(--space-6, 24px);
                left: 50%;
                transform: translateX(-50%);
                z-index: var(--z-toast, 700);
                pointer-events: none;
            }

            .toast {
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-xl, 12px);
                padding: var(--space-3, 12px) var(--space-5, 20px);
                display: flex;
                align-items: center;
                gap: var(--space-3, 12px);
                box-shadow: var(--shadow-lg,
                    0 10px 15px -3px rgba(44, 36, 22, 0.1),
                    0 4px 6px -2px rgba(44, 36, 22, 0.05));
                pointer-events: auto;
                animation: toastSlideIn var(--duration-normal, 250ms) var(--ease-spring);
                max-width: 420px;
                min-width: 280px;
                border-left: 3px solid;
            }

            .toast.hiding {
                animation: toastSlideOut var(--duration-fast, 150ms) var(--ease-in) forwards;
            }

            /* Type-specific accent colors */
            .toast.success {
                border-left-color: var(--color-success, #2E7D4A);
            }

            .toast.error {
                border-left-color: var(--color-error, #A0522D);
            }

            .toast.warning {
                border-left-color: var(--color-warning, #B8860B);
            }

            .toast.info {
                border-left-color: var(--color-info, #4A6B8A);
            }

            .icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .success .icon {
                color: var(--color-success, #2E7D4A);
            }

            .error .icon {
                color: var(--color-error, #A0522D);
            }

            .warning .icon {
                color: var(--color-warning, #B8860B);
            }

            .info .icon {
                color: var(--color-info, #4A6B8A);
            }

            .icon svg {
                width: 20px;
                height: 20px;
            }

            .message {
                font-size: var(--text-sm, 0.875rem);
                color: var(--color-text-primary, #2C2416);
                line-height: var(--leading-snug, 1.375);
                flex: 1;
            }

            .close-btn {
                background: transparent;
                border: none;
                color: var(--color-text-muted, #8B7E6A);
                cursor: pointer;
                padding: var(--space-1, 4px);
                margin: calc(-1 * var(--space-1, 4px));
                font-size: 1.25rem;
                flex-shrink: 0;
                border-radius: var(--radius-sm, 4px);
                transition: color var(--duration-fast, 150ms) var(--ease-out),
                            background var(--duration-fast, 150ms) var(--ease-out);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
            }

            .close-btn:hover {
                color: var(--color-text-primary, #2C2416);
                background: var(--color-bg-tertiary, #EDE6DB);
            }

            @keyframes toastSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(16px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes toastSlideOut {
                from {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateY(16px) scale(0.95);
                }
            }

            /* Mobile positioning */
            @media (max-width: 768px) {
                :host {
                    bottom: calc(var(--space-20, 80px) + var(--space-4, 16px)); /* Above FAB */
                    left: var(--space-4, 16px);
                    right: var(--space-4, 16px);
                    transform: none;
                }

                .toast {
                    max-width: none;
                    min-width: 0;
                }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .toast,
                .toast.hiding {
                    animation: none;
                }
            }
        `;
    }

    template() {
        if (!this._current) {
            return '';
        }

        const { type, message, dismissible } = this._current;

        // SVG icons for each type
        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`
        };

        return `
            <div class="toast ${type}" ref="toast">
                <span class="icon">${icons[type] || icons.info}</span>
                <span class="message">${this.escapeHtml(message)}</span>
                ${dismissible ? `
                    <button class="close-btn" ref="closeBtn" aria-label="Dismiss">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
    }

    afterRender() {
        const closeBtn = this.ref('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }

    onConnect() {
        // Listen for toast events
        this._unsubscribe = events.on(EVENT_NAMES.TOAST_SHOW, (data) => {
            this.show(data);
        });
    }

    onDisconnect() {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
    }

    /**
     * Show a toast notification
     * @param {Object} options
     * @param {string} options.message - Toast message
     * @param {string} options.type - Type: success, error, warning, info
     * @param {number} options.duration - Duration in ms (0 for no auto-hide)
     * @param {boolean} options.dismissible - Show close button
     */
    show({ message, type = 'info', duration = 4000, dismissible = true }) {
        // Queue if already showing
        if (this._current) {
            this._queue.push({ message, type, duration, dismissible });
            return;
        }

        this._current = { message, type, duration, dismissible };
        this.render();

        // Auto-hide after duration
        if (duration > 0) {
            this._timeout = setTimeout(() => this.hide(), duration);
        }
    }

    /**
     * Hide the current toast
     */
    hide() {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }

        const toast = this.ref('toast');
        if (toast) {
            toast.classList.add('hiding');
            setTimeout(() => {
                this._current = null;
                this.render();

                // Show next in queue
                if (this._queue.length > 0) {
                    this.show(this._queue.shift());
                }
            }, 150);
        } else {
            this._current = null;

            // Show next in queue
            if (this._queue.length > 0) {
                this.show(this._queue.shift());
            }
        }
    }

    /**
     * Convenience methods
     */
    success(message, duration) {
        this.show({ message, type: 'success', duration });
    }

    error(message, duration) {
        this.show({ message, type: 'error', duration });
    }

    warning(message, duration) {
        this.show({ message, type: 'warning', duration });
    }

    info(message, duration) {
        this.show({ message, type: 'info', duration });
    }
}

defineComponent('bt-toast', BtToast);

// Global toast helper
export function showToast(message, type = 'info', duration = 4000) {
    events.emit(EVENT_NAMES.TOAST_SHOW, { message, type, duration });
}
