/**
 * bt-toast - Toast notification component
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
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                z-index: var(--z-toast, 1100);
                pointer-events: none;
            }

            .toast {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 8px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                pointer-events: auto;
                animation: slideUp 0.3s ease;
                max-width: 400px;
            }

            .toast.hiding {
                animation: slideDown 0.2s ease forwards;
            }

            .toast.success {
                border-color: var(--green, #3fb950);
            }

            .toast.error {
                border-color: var(--red, #f85149);
            }

            .toast.warning {
                border-color: var(--yellow, #d29922);
            }

            .icon {
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            .success .icon {
                color: var(--green, #3fb950);
            }

            .error .icon {
                color: var(--red, #f85149);
            }

            .warning .icon {
                color: var(--yellow, #d29922);
            }

            .info .icon {
                color: var(--accent, #58a6ff);
            }

            .message {
                font-size: 0.875rem;
                color: var(--text, #c9d1d9);
            }

            .close-btn {
                background: none;
                border: none;
                color: var(--text-muted, #8b949e);
                cursor: pointer;
                padding: 4px;
                font-size: 1rem;
                margin-left: auto;
                flex-shrink: 0;
            }

            .close-btn:hover {
                color: var(--text, #c9d1d9);
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }

            /* Mobile positioning */
            @media (max-width: 768px) {
                :host {
                    bottom: 80px; /* Above FAB */
                    left: 16px;
                    right: 16px;
                    transform: none;
                }

                .toast {
                    max-width: none;
                }
            }
        `;
    }

    template() {
        if (!this._current) {
            return '';
        }

        const { type, message, dismissible } = this._current;
        const icons = {
            success: '\u2713',
            error: '\u2717',
            warning: '\u26A0',
            info: '\u2139'
        };

        return `
            <div class="toast ${type}" ref="toast">
                <span class="icon">${icons[type] || icons.info}</span>
                <span class="message">${this.escapeHtml(message)}</span>
                ${dismissible ? '<button class="close-btn" ref="closeBtn">&times;</button>' : ''}
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
            }, 200);
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
