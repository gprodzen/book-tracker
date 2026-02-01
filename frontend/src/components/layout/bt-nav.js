/**
 * bt-nav - Navigation tabs component
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { events } from '../../core/events.js';

export class BtNav extends BaseComponent {
    constructor() {
        super();
        this._handleRouteChange = this._handleRouteChange.bind(this);
    }

    styles() {
        return `
            :host {
                display: block;
            }

            nav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 0;
                border-bottom: 1px solid var(--border, #30363d);
            }

            .nav-brand {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text, #c9d1d9);
                text-decoration: none;
                cursor: pointer;
            }

            .nav-brand:hover {
                color: var(--accent, #58a6ff);
            }

            .nav-links {
                display: flex;
                gap: 8px;
            }

            .nav-link {
                padding: 8px 16px;
                border-radius: 6px;
                color: var(--text-muted, #8b949e);
                text-decoration: none;
                font-size: 0.875rem;
                transition: all 0.2s;
                cursor: pointer;
                border: none;
                background: none;
            }

            .nav-link:hover {
                color: var(--text, #c9d1d9);
                background: var(--bg-tertiary, #21262d);
            }

            .nav-link.active {
                color: var(--text, #c9d1d9);
                background: var(--bg-secondary, #161b22);
                border: 1px solid var(--border, #30363d);
            }

            .nav-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .logout-btn {
                padding: 6px 12px;
                border-radius: 6px;
                color: var(--text-muted, #8b949e);
                text-decoration: none;
                font-size: 0.75rem;
                cursor: pointer;
                border: 1px solid var(--border, #30363d);
                background: transparent;
                transition: all 0.2s;
            }

            .logout-btn:hover {
                color: var(--red, #f85149);
                border-color: var(--red, #f85149);
            }

            @media (max-width: 768px) {
                nav {
                    flex-direction: column;
                    gap: 12px;
                    padding: 12px 0;
                }

                .nav-links {
                    width: 100%;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .nav-link {
                    padding: 8px 12px;
                    font-size: 0.8rem;
                }
            }

            @media (max-width: 375px) {
                .nav-link {
                    padding: 6px 10px;
                    font-size: 0.75rem;
                }
            }
        `;
    }

    template() {
        const currentRoute = store.get('currentRoute');
        const authenticated = store.get('authenticated');

        const routes = [
            { name: 'dashboard', label: 'Dashboard' },
            { name: 'pipeline', label: 'Pipeline' },
            { name: 'paths', label: 'Paths' },
            { name: 'library', label: 'Library' }
        ];

        return `
            <nav>
                <a class="nav-brand" data-route="dashboard">Book Tracker</a>
                <div class="nav-links">
                    ${routes.map(route => `
                        <button
                            class="nav-link ${currentRoute === route.name ? 'active' : ''}"
                            data-route="${route.name}"
                        >${route.label}</button>
                    `).join('')}
                </div>
                ${authenticated ? `
                    <div class="nav-actions">
                        <button class="logout-btn" ref="logoutBtn">Sign Out</button>
                    </div>
                ` : ''}
            </nav>
        `;
    }

    afterRender() {
        // Handle navigation clicks
        this.$$('.nav-link, .nav-brand').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                if (route) {
                    router.navigate(route);
                }
            });
        });

        // Handle logout
        const logoutBtn = this.ref('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.emit('logout');
            });
        }
    }

    onConnect() {
        // Subscribe to route changes
        this._unsubRoute = events.on('route:change', this._handleRouteChange);
    }

    onDisconnect() {
        if (this._unsubRoute) this._unsubRoute();
    }

    _handleRouteChange() {
        this.render();
    }
}

defineComponent('bt-nav', BtNav);
