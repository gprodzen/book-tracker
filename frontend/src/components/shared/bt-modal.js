/**
 * bt-modal - Modal dialog container
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { events, EVENT_NAMES } from '../../core/events.js';

export class BtModal extends BaseComponent {
    static get observedAttributes() {
        return ['open', 'title'];
    }

    constructor() {
        super();
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleOverlayClick = this._handleOverlayClick.bind(this);
    }

    styles() {
        return `
            :host {
                display: none;
            }

            :host([open]) {
                display: block;
            }

            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: var(--z-modal, 1000);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: fadeIn 0.2s ease;
            }

            .modal {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 12px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.2s ease;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px;
                border-bottom: 1px solid var(--border, #30363d);
                position: sticky;
                top: 0;
                background: var(--bg-secondary, #161b22);
                z-index: 1;
            }

            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text, #c9d1d9);
                margin: 0;
                padding-right: 40px;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-muted, #8b949e);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: background 0.2s, color 0.2s;
                flex-shrink: 0;
            }

            .modal-close:hover {
                background: var(--bg-tertiary, #21262d);
                color: var(--text, #c9d1d9);
            }

            .modal-body {
                padding: 20px;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
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

            /* Mobile - full screen */
            @media (max-width: 768px) {
                .overlay {
                    padding: 0;
                }

                .modal {
                    max-width: 100%;
                    max-height: 100%;
                    height: 100%;
                    border-radius: 0;
                }
            }
        `;
    }

    template() {
        const title = this.getAttribute('title') || '';

        return `
            <div class="overlay" ref="overlay">
                <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div class="modal-header">
                        <h2 class="modal-title" id="modal-title">${this.escapeHtml(title)}</h2>
                        <button class="modal-close" ref="closeBtn" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        const closeBtn = this.ref('closeBtn');
        const overlay = this.ref('overlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (overlay) {
            overlay.addEventListener('click', this._handleOverlayClick);
        }
    }

    onConnect() {
        document.addEventListener('keydown', this._handleKeydown);
    }

    onDisconnect() {
        document.removeEventListener('keydown', this._handleKeydown);
    }

    onAttributeChange(name, oldValue, newValue) {
        if (name === 'open') {
            if (newValue !== null) {
                // Modal opened
                document.body.style.overflow = 'hidden';
                events.emit(EVENT_NAMES.MODAL_OPEN, { modal: this });

                // Focus first focusable element
                setTimeout(() => {
                    const focusable = this.shadowRoot.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusable) {
                        focusable.focus();
                    }
                }, 0);
            } else {
                // Modal closed
                document.body.style.overflow = '';
                events.emit(EVENT_NAMES.MODAL_CLOSE, { modal: this });
            }
        }
    }

    _handleKeydown(e) {
        if (e.key === 'Escape' && this.hasAttribute('open')) {
            this.close();
        }
    }

    _handleOverlayClick(e) {
        if (e.target === this.ref('overlay')) {
            this.close();
        }
    }

    open() {
        this.setAttribute('open', '');
    }

    close() {
        this.removeAttribute('open');
        this.emit('close');
    }

    /**
     * Set modal content
     * @param {string} title - Modal title
     * @param {string} content - HTML content
     */
    setContent(title, content) {
        this.setAttribute('title', title);
        this.innerHTML = content;
    }
}

defineComponent('bt-modal', BtModal);
