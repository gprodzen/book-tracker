/**
 * bt-login-view - Login view component
 */

import { BaseComponent, defineComponent } from '../core/base-component.js';
import { store } from '../core/store.js';
import { api } from '../services/api-client.js';
import { router } from '../core/router.js';
import { events, EVENT_NAMES } from '../core/events.js';

export class BtLoginView extends BaseComponent {
    constructor() {
        super();
        this.setState({
            loading: false,
            error: null
        });
    }

    styles() {
        return `
            :host {
                display: block;
            }

            .login-container {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 60vh;
            }

            .login-box {
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 12px;
                padding: 40px;
                max-width: 400px;
                width: 100%;
                text-align: center;
            }

            h1 {
                font-size: 1.5rem;
                margin-bottom: 8px;
                color: var(--text, #c9d1d9);
            }

            .subtitle {
                color: var(--text-muted, #8b949e);
                margin-bottom: 24px;
            }

            .form-group {
                text-align: left;
                margin-bottom: 16px;
            }

            .form-group input {
                width: 100%;
                padding: 12px;
                font-size: 1rem;
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
                border-radius: 6px;
                color: var(--text, #c9d1d9);
            }

            .form-group input:focus {
                outline: none;
                border-color: var(--accent, #58a6ff);
            }

            .error-message {
                color: var(--red, #f85149);
                font-size: 0.875rem;
                margin-bottom: 12px;
                padding: 8px;
                background: rgba(248, 81, 73, 0.1);
                border-radius: 6px;
            }

            .login-btn {
                width: 100%;
                padding: 12px;
                font-size: 1rem;
                margin-top: 8px;
                background: var(--accent, #58a6ff);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                transition: background 0.2s;
            }

            .login-btn:hover:not(:disabled) {
                background: var(--accent-hover, #79b8ff);
            }

            .login-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            @media (max-width: 768px) {
                .login-box {
                    margin: 20px;
                    padding: 24px;
                }
            }
        `;
    }

    template() {
        const { loading, error } = this.state;

        return `
            <div class="login-container">
                <div class="login-box">
                    <h1>Book Tracker</h1>
                    <p class="subtitle">Enter your password to continue</p>
                    <form ref="loginForm">
                        <div class="form-group">
                            <input
                                type="password"
                                ref="passwordInput"
                                placeholder="Password"
                                required
                                ${loading ? 'disabled' : ''}
                            >
                        </div>
                        ${error ? `<div class="error-message">${this.escapeHtml(error)}</div>` : ''}
                        <button type="submit" class="login-btn" ${loading ? 'disabled' : ''}>
                            ${loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    afterRender() {
        const form = this.ref('loginForm');
        const passwordInput = this.ref('passwordInput');

        if (form) {
            form.addEventListener('submit', (e) => this._handleSubmit(e));
        }

        // Auto-focus password input
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 0);
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();

        const passwordInput = this.ref('passwordInput');
        const password = passwordInput?.value;

        if (!password) {
            this.setState({ error: 'Please enter a password' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const result = await api.login(password);

            if (result.success) {
                store.set('authenticated', true);
                events.emit(EVENT_NAMES.AUTH_LOGIN);

                // Load settings
                try {
                    const settings = await api.getSettings();
                    store.set('settings', settings);
                } catch (e) {
                    console.error('Failed to load settings:', e);
                }

                // Navigate to dashboard
                router.navigate('dashboard');
            } else {
                this.setState({
                    loading: false,
                    error: result.error || 'Invalid password'
                });
            }
        } catch (error) {
            this.setState({
                loading: false,
                error: 'Connection failed. Please try again.'
            });
            console.error('Login error:', error);
        }
    }
}

defineComponent('bt-login-view', BtLoginView);
