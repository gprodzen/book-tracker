/**
 * bt-cover-fetch-progress - SSE-based progress display for batch cover fetching
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';

export class BtCoverFetchProgress extends BaseComponent {
    constructor() {
        super();
        this._eventSource = null;
        this.setState({
            status: 'idle', // idle | fetching | complete | error
            total: 0,
            current: 0,
            percent: 0,
            currentBook: '',
            enriched: 0,
            failed: 0,
            error: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .progress-container {
                background: var(--surface, #FFFFFF);
                border: 1px solid var(--border, #D4C9B8);
                border-radius: 8px;
                padding: 20px;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .progress-title {
                font-weight: 600;
                color: var(--text, #2C2416);
            }

            .progress-bar-container {
                height: 8px;
                background: var(--bg-tertiary, #EDE6DB);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 16px;
            }

            .progress-bar {
                height: 100%;
                background: var(--accent, #8B4513);
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .progress-bar.complete {
                background: var(--green, #2E7D4A);
            }

            .progress-stats {
                display: flex;
                gap: 24px;
                font-size: 0.875rem;
                margin-bottom: 12px;
            }

            .stat {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .stat-label {
                color: var(--text-muted, #8B7E6A);
            }

            .stat-value {
                font-weight: 600;
            }

            .stat-value.success {
                color: var(--green, #2E7D4A);
            }

            .stat-value.failed {
                color: var(--red, #A0522D);
            }

            .current-book {
                font-size: 0.875rem;
                color: var(--text-muted, #8B7E6A);
                margin-bottom: 16px;
                min-height: 1.2em;
            }

            .current-book span {
                color: var(--text, #2C2416);
                font-weight: 500;
            }

            .actions {
                display: flex;
                gap: 12px;
            }

            button {
                background: var(--bg-secondary, #F5F0E8);
                border: 1px solid var(--border, #D4C9B8);
                color: var(--text, #2C2416);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.875rem;
            }

            button:hover:not(:disabled) {
                background: var(--bg-tertiary, #EDE6DB);
            }

            button.primary {
                background: var(--accent, #8B4513);
                border-color: var(--accent);
                color: white;
            }

            button.primary:hover:not(:disabled) {
                background: var(--accent-hover, #A0522D);
            }

            .summary {
                background: var(--bg-tertiary, #EDE6DB);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
            }

            .summary-title {
                font-weight: 600;
                margin-bottom: 8px;
            }

            .error-message {
                color: var(--red, #A0522D);
                font-size: 0.875rem;
            }
        `;
    }

    template() {
        const { status, total, current, percent, currentBook, enriched, failed, error } = this.state;

        if (status === 'idle') {
            return '';
        }

        if (status === 'error') {
            return `
                <div class="progress-container">
                    <p class="error-message">Error: ${this.escapeHtml(error || 'Failed to fetch covers')}</p>
                    <div class="actions">
                        <button ref="retryBtn">Retry</button>
                        <button ref="closeBtn">Close</button>
                    </div>
                </div>
            `;
        }

        if (status === 'complete') {
            return `
                <div class="progress-container">
                    <div class="summary">
                        <div class="summary-title">Fetch Complete</div>
                        <div class="progress-stats">
                            <div class="stat">
                                <span class="stat-label">Found:</span>
                                <span class="stat-value success">${enriched}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Not found:</span>
                                <span class="stat-value failed">${failed}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Total:</span>
                                <span class="stat-value">${total}</span>
                            </div>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="primary" ref="doneBtn">Done</button>
                    </div>
                </div>
            `;
        }

        // Fetching status
        return `
            <div class="progress-container">
                <div class="progress-header">
                    <span class="progress-title">Fetching covers...</span>
                    <span>${current} / ${total}</span>
                </div>

                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>

                <div class="progress-stats">
                    <div class="stat">
                        <span class="stat-label">Found:</span>
                        <span class="stat-value success">${enriched}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Not found:</span>
                        <span class="stat-value failed">${failed}</span>
                    </div>
                </div>

                <div class="current-book">
                    ${currentBook ? `Processing: <span>${this.escapeHtml(currentBook)}</span>` : ''}
                </div>

                <div class="actions">
                    <button ref="cancelBtn">Cancel</button>
                </div>
            </div>
        `;
    }

    afterRender() {
        const cancelBtn = this.ref('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this._cancel());
        }

        const doneBtn = this.ref('doneBtn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                this.emit('fetch-complete');
            });
        }

        const closeBtn = this.ref('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.emit('fetch-cancel');
            });
        }

        const retryBtn = this.ref('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.startFetch());
        }
    }

    startFetch() {
        this.setState({
            status: 'fetching',
            total: 0,
            current: 0,
            percent: 0,
            currentBook: '',
            enriched: 0,
            failed: 0,
            error: null
        });

        const apiBase = window.location.hostname === 'localhost'
            ? 'http://localhost:5001/api'
            : '/api';

        this._eventSource = new EventSource(`${apiBase}/books/enrich-stream`, {
            withCredentials: true
        });

        this._eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'start') {
                this.setState({ total: data.total });
            } else if (data.type === 'progress') {
                this.setState({
                    current: data.current,
                    percent: data.percent,
                    currentBook: data.book_title,
                    enriched: data.enriched,
                    failed: data.failed
                });
            } else if (data.type === 'complete') {
                this._eventSource.close();
                this._eventSource = null;
                this.setState({
                    status: 'complete',
                    enriched: data.enriched,
                    failed: data.failed,
                    total: data.total,
                    percent: 100
                });
            }
        };

        this._eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            if (this._eventSource) {
                this._eventSource.close();
                this._eventSource = null;
            }
            this.setState({
                status: 'error',
                error: 'Connection lost. Please try again.'
            });
        };
    }

    _cancel() {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
        this.emit('fetch-cancel');
    }

    onDisconnect() {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    }
}

defineComponent('bt-cover-fetch-progress', BtCoverFetchProgress);
