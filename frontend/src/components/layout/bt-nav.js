/**
 * bt-nav - Professional navigation component with fixed header
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { events } from '../../core/events.js';

export class BtNav extends BaseComponent {
    constructor() {
        super();
        this._handleRouteChange = this._handleRouteChange.bind(this);
        this._handleResize = this._handleResize.bind(this);
        this._mobileMenuOpen = false;
    }

    styles() {
        return `
            :host {
                display: block;
                position: sticky;
                top: 0;
                z-index: var(--z-fixed, 300);
            }

            nav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                height: var(--nav-height, 64px);
                padding: 0 var(--space-6, 24px);
                background: rgba(250, 247, 242, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border-bottom: 1px solid var(--color-border-subtle, #E5DED2);
            }

            .nav-brand {
                font-size: var(--text-lg, 1.125rem);
                font-weight: var(--font-semibold, 600);
                color: var(--color-text-primary, #2C2416);
                text-decoration: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: var(--space-2, 8px);
                transition: color var(--duration-fast, 150ms) var(--ease-out);
            }

            .nav-brand:hover {
                color: var(--color-accent, #8B4513);
            }

            .nav-brand-icon {
                font-size: 1.25rem;
            }

            .nav-links {
                display: flex;
                gap: var(--space-1, 4px);
                position: relative;
            }

            .nav-link {
                position: relative;
                padding: var(--space-2, 8px) var(--space-4, 16px);
                border-radius: var(--radius-md, 6px);
                color: var(--color-text-secondary, #5C5244);
                text-decoration: none;
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-medium, 500);
                transition: color var(--duration-fast, 150ms) var(--ease-out),
                            background var(--duration-fast, 150ms) var(--ease-out);
                cursor: pointer;
                border: none;
                background: none;
            }

            .nav-link:hover {
                color: var(--color-text-primary, #2C2416);
                background: var(--color-bg-tertiary, #EDE6DB);
            }

            .nav-link.active {
                color: var(--color-accent, #8B4513);
            }

            /* Animated underline for active state */
            .nav-link::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                width: 0;
                height: 2px;
                background: var(--color-accent, #8B4513);
                border-radius: var(--radius-full, 9999px);
                transform: translateX(-50%);
                transition: width var(--duration-normal, 250ms) var(--ease-out);
            }

            .nav-link.active::after {
                width: calc(100% - var(--space-8, 32px));
            }

            .nav-link:hover::after {
                width: calc(100% - var(--space-8, 32px));
            }

            .nav-actions {
                display: flex;
                align-items: center;
                gap: var(--space-3, 12px);
            }

            .logout-btn {
                padding: var(--space-2, 8px) var(--space-3, 12px);
                border-radius: var(--radius-md, 6px);
                color: var(--color-text-muted, #8B7E6A);
                font-size: var(--text-xs, 0.75rem);
                font-weight: var(--font-medium, 500);
                cursor: pointer;
                border: 1px solid var(--color-border, #D4C9B8);
                background: transparent;
                transition: color var(--duration-fast, 150ms) var(--ease-out),
                            border-color var(--duration-fast, 150ms) var(--ease-out);
            }

            .logout-btn:hover {
                color: var(--color-error, #A0522D);
                border-color: var(--color-error, #A0522D);
            }

            /* Mobile hamburger button */
            .mobile-menu-btn {
                display: none;
                width: 40px;
                height: 40px;
                padding: 0;
                background: none;
                border: none;
                cursor: pointer;
                position: relative;
            }

            .hamburger {
                width: 20px;
                height: 2px;
                background: var(--color-text-primary, #2C2416);
                border-radius: 2px;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                transition: background var(--duration-fast, 150ms) var(--ease-out);
            }

            .hamburger::before,
            .hamburger::after {
                content: '';
                width: 20px;
                height: 2px;
                background: var(--color-text-primary, #2C2416);
                border-radius: 2px;
                position: absolute;
                left: 0;
                transition: transform var(--duration-normal, 250ms) var(--ease-out),
                            top var(--duration-normal, 250ms) var(--ease-out);
            }

            .hamburger::before {
                top: -6px;
            }

            .hamburger::after {
                top: 6px;
            }

            /* Hamburger animation when open */
            .mobile-menu-btn.open .hamburger {
                background: transparent;
            }

            .mobile-menu-btn.open .hamburger::before {
                top: 0;
                transform: rotate(45deg);
            }

            .mobile-menu-btn.open .hamburger::after {
                top: 0;
                transform: rotate(-45deg);
            }

            /* Mobile menu overlay */
            .mobile-menu {
                display: none;
                position: fixed;
                top: var(--nav-height, 64px);
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(250, 247, 242, 0.98);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: var(--space-4, 16px);
                animation: fadeIn var(--duration-fast, 150ms) var(--ease-out);
            }

            .mobile-menu.open {
                display: block;
            }

            .mobile-nav-links {
                display: flex;
                flex-direction: column;
                gap: var(--space-2, 8px);
            }

            .mobile-nav-link {
                display: block;
                padding: var(--space-4, 16px);
                border-radius: var(--radius-lg, 8px);
                color: var(--color-text-secondary, #5C5244);
                text-decoration: none;
                font-size: var(--text-lg, 1.125rem);
                font-weight: var(--font-medium, 500);
                background: var(--color-bg-secondary, #F5F0E8);
                border: 1px solid var(--color-border-subtle, #E5DED2);
                cursor: pointer;
                transition: all var(--duration-fast, 150ms) var(--ease-out);
            }

            .mobile-nav-link:hover {
                color: var(--color-text-primary, #2C2416);
                border-color: var(--color-border, #D4C9B8);
            }

            .mobile-nav-link.active {
                color: var(--color-accent, #8B4513);
                border-color: var(--color-accent, #8B4513);
                border-left-width: 3px;
            }

            .mobile-logout {
                margin-top: var(--space-4, 16px);
                padding-top: var(--space-4, 16px);
                border-top: 1px solid var(--color-border-subtle, #E5DED2);
            }

            .mobile-logout .logout-btn {
                width: 100%;
                padding: var(--space-3, 12px);
                font-size: var(--text-base, 0.875rem);
            }

            /* Responsive */
            @media (max-width: 768px) {
                nav {
                    padding: 0 var(--space-4, 16px);
                }

                .nav-links,
                .nav-actions {
                    display: none;
                }

                .mobile-menu-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            }

            /* Keyframes */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
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
                <a class="nav-brand" data-route="dashboard">
                    <span class="nav-brand-icon">📚</span>
                    <span>Book Tracker</span>
                </a>

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
                ` : '<div class="nav-actions"></div>'}

                <button class="mobile-menu-btn ${this._mobileMenuOpen ? 'open' : ''}" ref="mobileMenuBtn" aria-label="Toggle menu">
                    <span class="hamburger"></span>
                </button>
            </nav>

            <div class="mobile-menu ${this._mobileMenuOpen ? 'open' : ''}" ref="mobileMenu">
                <div class="mobile-nav-links">
                    ${routes.map(route => `
                        <button
                            class="mobile-nav-link ${currentRoute === route.name ? 'active' : ''}"
                            data-route="${route.name}"
                        >${route.label}</button>
                    `).join('')}
                </div>
                ${authenticated ? `
                    <div class="mobile-logout">
                        <button class="logout-btn" ref="mobileLogoutBtn">Sign Out</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    afterRender() {
        // Handle navigation clicks (desktop)
        this.$$('.nav-link, .nav-brand').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                if (route) {
                    router.navigate(route);
                }
            });
        });

        // Handle navigation clicks (mobile)
        this.$$('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                if (route) {
                    this._closeMobileMenu();
                    router.navigate(route);
                }
            });
        });

        // Handle logout (desktop)
        const logoutBtn = this.ref('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.emit('logout');
            });
        }

        // Handle logout (mobile)
        const mobileLogoutBtn = this.ref('mobileLogoutBtn');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', () => {
                this._closeMobileMenu();
                this.emit('logout');
            });
        }

        // Handle mobile menu toggle
        const mobileMenuBtn = this.ref('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this._toggleMobileMenu();
            });
        }

        // Close menu on click outside
        const mobileMenu = this.ref('mobileMenu');
        if (mobileMenu) {
            mobileMenu.addEventListener('click', (e) => {
                if (e.target === mobileMenu) {
                    this._closeMobileMenu();
                }
            });
        }
    }

    onConnect() {
        // Subscribe to route changes
        this._unsubRoute = events.on('route:change', this._handleRouteChange);

        // Listen for resize to close mobile menu
        window.addEventListener('resize', this._handleResize);
    }

    onDisconnect() {
        if (this._unsubRoute) this._unsubRoute();
        window.removeEventListener('resize', this._handleResize);
    }

    _handleRouteChange() {
        this._closeMobileMenu();
        this.render();
    }

    _handleResize() {
        if (window.innerWidth > 768 && this._mobileMenuOpen) {
            this._closeMobileMenu();
        }
    }

    _toggleMobileMenu() {
        this._mobileMenuOpen = !this._mobileMenuOpen;
        this.render();

        // Prevent body scroll when menu is open
        document.body.style.overflow = this._mobileMenuOpen ? 'hidden' : '';
    }

    _closeMobileMenu() {
        if (this._mobileMenuOpen) {
            this._mobileMenuOpen = false;
            this.render();
            document.body.style.overflow = '';
        }
    }
}

defineComponent('bt-nav', BtNav);
