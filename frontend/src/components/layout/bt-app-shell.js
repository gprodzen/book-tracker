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
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }

            .offline-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: var(--yellow, #d29922);
                color: #000;
                text-align: center;
                padding: 8px;
                font-size: 0.875rem;
                font-weight: 500;
                z-index: 1000;
                transform: translateY(-100%);
                transition: transform 0.3s ease;
            }

            .offline-banner.visible {
                transform: translateY(0);
            }

            .pending-count {
                margin-left: 8px;
                background: rgba(0, 0, 0, 0.2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
            }

            .header-slot {
                margin-bottom: 24px;
            }

            .main-content {
                min-height: calc(100vh - 200px);
            }

            @media (max-width: 768px) {
                .app-shell {
                    padding: 12px;
                }
            }
        `;
    }

    template() {
        const isOnline = store.get('isOnline');
        const pendingMutations = store.get('pendingMutations') || [];
        const pendingCount = pendingMutations.length;

        return `
            <div class="offline-banner ${!isOnline ? 'visible' : ''}" ref="offlineBanner">
                You're offline. Changes will sync when you reconnect.
                ${pendingCount > 0 ? `<span class="pending-count">${pendingCount} pending</span>` : ''}
            </div>
            <div class="app-shell">
                <header class="header-slot">
                    <slot name="header"></slot>
                </header>
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
