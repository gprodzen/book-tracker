/**
 * bt-modal - Modal dialog container
 *
 * Polished with backdrop blur, scale + fade animations, and mobile full-screen mode.
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
                background: rgba(44, 36, 22, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: var(--z-modal, 500);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-5, 20px);
                animation: overlayFadeIn var(--duration-normal, 250ms) var(--ease-out);
            }

            .modal {
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border, #D4C9B8);
                border-radius: var(--radius-2xl, 16px);
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: var(--shadow-xl,
                    0 20px 25px -5px rgba(44, 36, 22, 0.1),
                    0 10px 10px -5px rgba(44, 36, 22, 0.04));
                animation: modalSlideIn var(--duration-normal, 250ms) var(--ease-spring);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-5, 20px) var(--space-6, 24px);
                border-bottom: 1px solid var(--color-border-subtle, #E5DED2);
                background: linear-gradient(
                    180deg,
                    var(--color-bg-secondary, #F5F0E8) 0%,
                    rgba(245, 240, 232, 0.98) 100%
                );
                position: sticky;
                top: 0;
                z-index: 1;
            }

            .modal-title {
                font-size: var(--text-xl, 1.375rem);
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2C2416);
                margin: 0;
                line-height: var(--leading-tight, 1.25);
            }

            .modal-close {
                background: transparent;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--color-text-muted, #8B7E6A);
                padding: 0;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--radius-md, 6px);
                transition: background var(--duration-fast, 150ms) var(--ease-out),
                            color var(--duration-fast, 150ms) var(--ease-out);
                flex-shrink: 0;
                margin-left: var(--space-4, 16px);
            }

            .modal-close:hover {
                background: var(--color-bg-tertiary, #EDE6DB);
                color: var(--color-text-primary, #2C2416);
            }

            .modal-close:focus-visible {
                outline: none;
                box-shadow: var(--focus-ring);
            }

            .modal-body {
                padding: var(--space-6, 24px);
                overflow-y: auto;
                flex: 1;
            }

            .modal-body::-webkit-scrollbar {
                width: 8px;
            }

            .modal-body::-webkit-scrollbar-track {
                background: transparent;
            }

            .modal-body::-webkit-scrollbar-thumb {
                background: var(--color-bg-tertiary, #EDE6DB);
                border-radius: var(--radius-full, 9999px);
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-3, 12px);
                padding: var(--space-4, 16px) var(--space-6, 24px);
                border-top: 1px solid var(--color-border-subtle, #E5DED2);
                background: var(--color-bg-secondary, #F5F0E8);
            }

            /* Animations */
            @keyframes overlayFadeIn {
                from {
                    opacity: 0;
                    backdrop-filter: blur(0);
                }
                to {
                    opacity: 1;
                    backdrop-filter: blur(8px);
                }
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(16px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            /* Closing animation (applied via JS) */
            .overlay.closing {
                animation: overlayFadeOut var(--duration-fast, 150ms) var(--ease-in) forwards;
            }

            .overlay.closing .modal {
                animation: modalSlideOut var(--duration-fast, 150ms) var(--ease-in) forwards;
            }

            @keyframes overlayFadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }

            @keyframes modalSlideOut {
                from {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: scale(0.95) translateY(16px);
                }
            }

            /* Mobile - full screen */
            @media (max-width: 768px) {
                .overlay {
                    padding: 0;
                    align-items: flex-end;
                }

                .modal {
                    max-width: 100%;
                    max-height: 95vh;
                    border-radius: var(--radius-2xl, 16px) var(--radius-2xl, 16px) 0 0;
                    animation: modalSlideUpMobile var(--duration-normal, 250ms) var(--ease-out);
                }

                .modal-header {
                    padding: var(--space-4, 16px);
                }

                .modal-title {
                    font-size: var(--text-lg, 1.125rem);
                }

                .modal-body {
                    padding: var(--space-4, 16px);
                }

                .modal-footer {
                    padding: var(--space-4, 16px);
                }

                @keyframes modalSlideUpMobile {
                    from {
                        opacity: 0;
                        transform: translateY(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .overlay.closing .modal {
                    animation: modalSlideDownMobile var(--duration-fast, 150ms) var(--ease-in) forwards;
                }

                @keyframes modalSlideDownMobile {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(100%);
                    }
                }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .overlay,
                .modal,
                .overlay.closing,
                .overlay.closing .modal {
                    animation: none;
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
                        <button class="modal-close" ref="closeBtn" aria-label="Close modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
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
        // Add closing animation
        const overlay = this.ref('overlay');
        if (overlay) {
            overlay.classList.add('closing');
            setTimeout(() => {
                this.removeAttribute('open');
                overlay.classList.remove('closing');
                this.emit('close');
            }, 150);
        } else {
            this.removeAttribute('open');
            this.emit('close');
        }
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
