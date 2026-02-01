/**
 * bt-book-cover - Book cover image with fallback placeholder
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtBookCover extends BaseComponent {
    static get observedAttributes() {
        return ['src', 'title', 'size'];
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .cover {
                aspect-ratio: 2/3;
                background: var(--bg-tertiary, #21262d);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                border-radius: inherit;
            }

            .cover img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .cover img.loaded {
                opacity: 1;
            }

            .placeholder {
                padding: 16px;
                text-align: center;
                font-size: 0.75rem;
                color: var(--text-muted, #8b949e);
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: linear-gradient(135deg, var(--bg-tertiary, #21262d) 0%, var(--bg-secondary, #161b22) 100%);
                word-break: break-word;
                line-height: 1.3;
            }

            :host([size="small"]) .cover {
                aspect-ratio: auto;
                width: 50px;
                height: 75px;
            }

            :host([size="small"]) .placeholder {
                font-size: 0.6rem;
                padding: 4px;
            }

            :host([size="large"]) .cover {
                aspect-ratio: auto;
                width: 200px;
                height: 300px;
            }

            :host([size="large"]) .placeholder {
                font-size: 1rem;
            }
        `;
    }

    template() {
        const src = this.getAttribute('src');
        const title = this.getAttribute('title') || 'Book cover';

        if (src) {
            return `
                <div class="cover">
                    <img
                        src="${this.escapeHtml(src)}"
                        alt="${this.escapeHtml(title)}"
                        loading="lazy"
                    >
                    <div class="placeholder" style="display: none;">${this.escapeHtml(title)}</div>
                </div>
            `;
        }

        return `
            <div class="cover">
                <div class="placeholder">${this.escapeHtml(title)}</div>
            </div>
        `;
    }

    afterRender() {
        const img = this.$('img');
        if (img) {
            img.onload = () => {
                img.classList.add('loaded');
            };
            img.onerror = () => {
                img.style.display = 'none';
                const placeholder = this.$('.placeholder');
                if (placeholder) {
                    placeholder.style.display = 'flex';
                }
            };
        }
    }
}

defineComponent('bt-book-cover', BtBookCover);
