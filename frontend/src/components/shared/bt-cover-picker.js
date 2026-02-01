/**
 * bt-cover-picker - Grid of selectable cover options from Open Library
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { api } from '../../services/api-client.js';

export class BtCoverPicker extends BaseComponent {
    static get observedAttributes() {
        return ['book-id'];
    }

    constructor() {
        super();
        this.setState({
            loading: true,
            error: null,
            bookTitle: '',
            bookAuthor: '',
            covers: [],
            selectedIndex: -1,
            showManualInput: false,
            manualUrl: ''
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .picker-container {
                max-width: 600px;
            }

            .book-info {
                margin-bottom: 16px;
            }

            .book-title {
                font-weight: 600;
                color: var(--text, #2C2416);
            }

            .book-author {
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            .loading {
                text-align: center;
                padding: 40px;
                color: var(--text-muted, #8B7E6A);
            }

            .error {
                text-align: center;
                padding: 40px;
                color: var(--red, #A0522D);
            }

            .covers-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            }

            .cover-option {
                position: relative;
                aspect-ratio: 2/3;
                background: var(--bg-tertiary, #EDE6DB);
                border: 2px solid transparent;
                border-radius: 6px;
                overflow: hidden;
                cursor: pointer;
                transition: border-color 0.15s ease, transform 0.15s ease;
            }

            .cover-option:hover {
                border-color: var(--border, #D4C9B8);
                transform: translateY(-2px);
            }

            .cover-option.selected {
                border-color: var(--accent, #8B4513);
            }

            .cover-option.selected::after {
                content: '\u2713';
                position: absolute;
                top: 6px;
                right: 6px;
                width: 24px;
                height: 24px;
                background: var(--accent, #8B4513);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.875rem;
                font-weight: bold;
            }

            .cover-option img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .cover-meta {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.7));
                padding: 20px 8px 8px;
                font-size: 0.65rem;
                color: white;
                opacity: 0;
                transition: opacity 0.15s ease;
            }

            .cover-option:hover .cover-meta {
                opacity: 1;
            }

            .no-covers {
                text-align: center;
                padding: 40px;
                color: var(--text-muted, #8B7E6A);
            }

            .manual-link {
                display: inline-block;
                margin-top: 16px;
                color: var(--accent, #8B4513);
                cursor: pointer;
                font-size: 0.875rem;
            }

            .manual-link:hover {
                text-decoration: underline;
            }

            .manual-input-section {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid var(--border, #D4C9B8);
            }

            .manual-input-section label {
                display: block;
                margin-bottom: 8px;
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
            }

            .manual-input-section input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 6px;
                font-size: 0.875rem;
                background: var(--surface, #FFFFFF);
                color: var(--text, #2C2416);
            }

            .manual-input-section input:focus {
                outline: none;
                border-color: var(--accent, #8B4513);
            }

            .actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding-top: 20px;
                border-top: 1px solid var(--border, #D4C9B8);
            }

            button {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
            }

            button:hover:not(:disabled) {
                background: var(--bg-tertiary, #EDE6DB);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            button.primary {
                background: var(--accent, #8B4513);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #A0522D);
            }

            @media (max-width: 480px) {
                .covers-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
            }
        `;
    }

    template() {
        const { loading, error, bookTitle, bookAuthor, covers, selectedIndex, showManualInput, manualUrl } = this.state;

        if (loading) {
            return `
                <div class="picker-container">
                    <div class="loading">Searching for covers...</div>
                </div>
            `;
        }

        if (error) {
            return `
                <div class="picker-container">
                    <div class="error">${this.escapeHtml(error)}</div>
                    <div class="actions">
                        <button ref="cancelBtn">Cancel</button>
                    </div>
                </div>
            `;
        }

        const hasSelection = selectedIndex >= 0 || (showManualInput && manualUrl.trim());

        return `
            <div class="picker-container">
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(bookTitle)}</div>
                    <div class="book-author">${this.escapeHtml(bookAuthor)}</div>
                </div>

                ${covers.length > 0 ? `
                    <div class="covers-grid">
                        ${covers.map((cover, index) => `
                            <div class="cover-option ${selectedIndex === index ? 'selected' : ''}" data-index="${index}">
                                <img src="${cover.medium}" alt="Cover option ${index + 1}" loading="lazy">
                                ${cover.publisher || cover.year ? `
                                    <div class="cover-meta">
                                        ${cover.publisher ? this.escapeHtml(cover.publisher) : ''}
                                        ${cover.year ? ` (${cover.year})` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-covers">
                        No covers found in Open Library.
                    </div>
                `}

                <a class="manual-link" ref="manualToggle">
                    ${showManualInput ? 'Hide manual entry' : 'Enter URL manually'}
                </a>

                ${showManualInput ? `
                    <div class="manual-input-section">
                        <label>Cover Image URL</label>
                        <input type="url" ref="manualInput" value="${this.escapeHtml(manualUrl)}" placeholder="https://...">
                    </div>
                ` : ''}

                <div class="actions">
                    <button ref="cancelBtn">Cancel</button>
                    <button class="primary" ref="selectBtn" ${!hasSelection ? 'disabled' : ''}>
                        ${hasSelection ? 'Select Cover' : 'Choose a cover'}
                    </button>
                </div>
            </div>
        `;
    }

    afterRender() {
        // Cover selection
        this.$$('.cover-option').forEach(option => {
            option.addEventListener('click', () => {
                const index = parseInt(option.dataset.index);
                this.setState({ selectedIndex: index, manualUrl: '' });
            });
        });

        // Manual toggle
        const manualToggle = this.ref('manualToggle');
        if (manualToggle) {
            manualToggle.addEventListener('click', () => {
                this.setState({
                    showManualInput: !this.state.showManualInput,
                    selectedIndex: -1
                });
            });
        }

        // Manual input
        const manualInput = this.ref('manualInput');
        if (manualInput) {
            manualInput.addEventListener('input', (e) => {
                this.setState({
                    manualUrl: e.target.value,
                    selectedIndex: -1
                });
            });
        }

        // Cancel button
        const cancelBtn = this.ref('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.emit('cancel'));
        }

        // Select button
        const selectBtn = this.ref('selectBtn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => this._handleSelect());
        }
    }

    _handleSelect() {
        const { covers, selectedIndex, manualUrl } = this.state;

        let coverUrl = null;

        if (selectedIndex >= 0 && covers[selectedIndex]) {
            coverUrl = covers[selectedIndex].large;
        } else if (manualUrl.trim()) {
            coverUrl = manualUrl.trim();
        }

        if (coverUrl) {
            this.emit('cover-selected', { coverUrl });
        }
    }

    onAttributeChange(name, oldValue, newValue) {
        if (name === 'book-id' && newValue) {
            this._loadCovers(parseInt(newValue));
        }
    }

    async onConnect() {
        const bookId = this.getAttribute('book-id');
        if (bookId) {
            await this._loadCovers(parseInt(bookId));
        }
    }

    async _loadCovers(bookId) {
        this.setState({ loading: true, error: null });

        try {
            const data = await api.getCoverOptions(bookId);
            this.setState({
                loading: false,
                bookTitle: data.title,
                bookAuthor: data.author,
                covers: data.covers || []
            });
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Failed to load cover options'
            });
            console.error('Cover options error:', error);
        }
    }

    set bookId(id) {
        this._loadCovers(id);
    }
}

defineComponent('bt-cover-picker', BtCoverPicker);
