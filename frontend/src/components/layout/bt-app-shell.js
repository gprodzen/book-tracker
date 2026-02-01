/**
 * bt-app-shell - Main application container with header slot
 */

import { BaseComponent, defineComponent } from '../../core/base-component.js';
import { store } from '../../core/store.js';
import { events, EVENT_NAMES } from '../../core/events.js';

export class BtAppShell extends BaseComponent {
    constructor() {
        super();
        this._handleOnline = this._handleOnline.bind(this);
        this._handleOffline = this._handleOffline.bind(this);
    }

    styles() {
        return `
            :host {
                display: block;
                min-height: 100vh;
            }

            .app-shell {
                max-width: var(--container-max, 1400px);
                margin: 0 auto;
                padding: var(--space-6, 24px);
            }

            .offline-banner {
                position: fixed;
                top: var(--nav-height, 64px);
                left: 0;
                right: 0;
                background: linear-gradient(135deg, var(--color-warning, #B8860B) 0%, #9A7209 100%);
                color: var(--color-text-inverse, #FFFFFF);
                text-align: center;
                padding: var(--space-2, 8px) var(--space-4, 16px);
                font-size: var(--text-sm, 0.875rem);
                font-weight: var(--font-medium, 500);
                z-index: var(--z-sticky, 200);
                transform: translateY(-100%);
                transition: transform var(--duration-normal, 250ms) var(--ease-out);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--space-2, 8px);
            }

            .offline-banner.visible {
                transform: translateY(0);
            }

            .offline-icon {
                font-size: 1rem;
            }

            .pending-count {
                background: rgba(0, 0, 0, 0.15);
                padding: var(--space-1, 4px) var(--space-2, 8px);
                border-radius: var(--radius-full, 9999px);
                font-size: var(--text-xs, 0.75rem);
                font-family: var(--font-mono);
            }

            .header-slot {
                /* Header is now fixed, no margin needed */
            }

            .main-content {
                min-height: calc(100vh - var(--nav-height, 64px) - var(--space-12, 48px));
                animation: fadeIn var(--duration-normal, 250ms) var(--ease-out);
            }

            @media (max-width: 768px) {
                .app-shell {
                    padding: var(--space-4, 16px);
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
    }

    template() {
        const isOnline = store.get('isOnline');
        const pendingMutations = store.get('pendingMutations') || [];
        const pendingCount = pendingMutations.length;

        return `
            <div class="offline-banner ${!isOnline ? 'visible' : ''}" ref="offlineBanner">
                <span class="offline-icon">📡</span>
                <span>You're offline. Changes will sync when you reconnect.</span>
                ${pendingCount > 0 ? `<span class="pending-count">${pendingCount} pending</span>` : ''}
            </div>
            <div class="app-shell">
                <main class="main-content">
                    <slot></slot>
                </main>
            </div>
        `;
    }

    onConnect() {
        // Subscribe to online/offline events
        this._unsubOnline = events.on(EVENT_NAMES.ONLINE, this._handleOnline);
        this._unsubOffline = events.on(EVENT_NAMES.OFFLINE, this._handleOffline);

        // Subscribe to pending mutations changes
        this._unsubPending = store.subscribe('pendingMutations', () => {
            this.render();
        });
    }

    onDisconnect() {
        if (this._unsubOnline) this._unsubOnline();
        if (this._unsubOffline) this._unsubOffline();
        if (this._unsubPending) this._unsubPending();
    }

    _handleOnline() {
        this.render();
    }

    _handleOffline() {
        this.render();
    }
}

defineComponent('bt-app-shell', BtAppShell);
