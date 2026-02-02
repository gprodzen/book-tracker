/**
 * BaseComponent - Base class for all Web Components
 * Provides Shadow DOM encapsulation, reactive state, lifecycle management,
 * and efficient DOM diffing via morphdom.
 */

import morphdom from '../lib/morphdom.esm.js';

export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this._state = {};
        this._refs = {};
        this._subscriptions = [];
        this._connected = false;
        this._hasRendered = false;
        this._lastTemplate = null;
        this._attachedListeners = new WeakMap();

        // Create Shadow DOM
        this.attachShadow({ mode: 'open' });
    }

    /**
     * Get current state
     */
    get state() {
        return this._state;
    }

    /**
     * Update state and trigger re-render
     * @param {Object} newState - Partial state to merge
     */
    setState(newState) {
        const oldState = { ...this._state };
        this._state = { ...this._state, ...newState };

        if (this._connected) {
            this.onStateChange(oldState, this._state);
            this.render();
        }
    }

    /**
     * Override to define component styles
     * @returns {string} CSS styles for the component
     */
    styles() {
        return '';
    }

    /**
     * Override to define component template
     * @returns {string} HTML template string
     */
    template() {
        return '';
    }

    /**
     * Render the component using morphdom for efficient DOM updates
     */
    render() {
        const styles = this.styles();
        const template = this.template();

        // First render: use innerHTML (no existing DOM to diff)
        if (!this._hasRendered) {
            this.shadowRoot.innerHTML = `
                ${styles ? `<style>${styles}</style>` : ''}
                <div data-bt-root>${template}</div>
            `;
            this._hasRendered = true;
            this._lastTemplate = template;
            this._cacheRefs();
            this.afterRender();
            return;
        }

        // Skip if template unchanged
        if (template === this._lastTemplate) {
            return;
        }
        this._lastTemplate = template;

        // Find root element for morphing
        const rootEl = this.shadowRoot.querySelector('[data-bt-root]');
        if (!rootEl) {
            // Fallback to full render if root element is missing
            this.shadowRoot.innerHTML = `
                ${styles ? `<style>${styles}</style>` : ''}
                <div data-bt-root>${template}</div>
            `;
            this._cacheRefs();
            this.afterRender();
            return;
        }

        // Store focus state for restoration
        const activeEl = this.shadowRoot.activeElement;
        let focusRef = null;
        let selStart, selEnd;

        if (activeEl) {
            // Remember which element had focus by ref or other identifier
            focusRef = activeEl.getAttribute('ref') ||
                       activeEl.getAttribute('data-key') ||
                       activeEl.id;

            if (activeEl.selectionStart !== undefined) {
                selStart = activeEl.selectionStart;
                selEnd = activeEl.selectionEnd;
            }
        }

        // Create temp container with new content
        const temp = document.createElement('div');
        temp.setAttribute('data-bt-root', '');
        temp.innerHTML = template;

        // Morph with custom element handling
        morphdom(rootEl, temp, {
            getNodeKey: (node) => {
                if (node.nodeType === 1) {
                    return node.getAttribute('data-key') ||
                           node.getAttribute('ref') ||
                           node.id || null;
                }
                return null;
            },
            onBeforeElUpdated: (fromEl, toEl) => {
                // Skip custom elements - they manage their own rendering
                // Check if tag name contains a hyphen (custom element)
                if (fromEl.tagName && fromEl.tagName.includes('-') &&
                    !fromEl.hasAttribute('data-bt-root')) {
                    // Sync attributes from new element to existing
                    this._syncAttributes(fromEl, toEl);
                    return false; // Don't morph this element's contents
                }
                return true;
            },
            onBeforeNodeDiscarded: (node) => {
                // Clean up listener tracking for discarded elements
                if (this._attachedListeners.has(node)) {
                    this._attachedListeners.delete(node);
                }
                return true;
            }
        });

        // Restore focus
        if (focusRef) {
            const newActiveEl = this.shadowRoot.querySelector(`[ref="${focusRef}"]`) ||
                                this.shadowRoot.querySelector(`[data-key="${focusRef}"]`) ||
                                this.shadowRoot.getElementById(focusRef);

            if (newActiveEl && typeof newActiveEl.focus === 'function') {
                newActiveEl.focus();
                if (selStart !== undefined && newActiveEl.setSelectionRange) {
                    try {
                        newActiveEl.setSelectionRange(selStart, selEnd);
                    } catch (e) {
                        // Some input types don't support setSelectionRange
                    }
                }
            }
        }

        this._cacheRefs();
        this.afterRender();
    }

    /**
     * Sync attributes from one element to another (for custom elements)
     * @param {Element} fromEl - Existing element
     * @param {Element} toEl - New element with updated attributes
     */
    _syncAttributes(fromEl, toEl) {
        // Remove attributes not in toEl
        const fromAttrs = Array.from(fromEl.attributes);
        for (const attr of fromAttrs) {
            if (!toEl.hasAttribute(attr.name)) {
                fromEl.removeAttribute(attr.name);
            }
        }

        // Add/update attributes from toEl
        const toAttrs = Array.from(toEl.attributes);
        for (const attr of toAttrs) {
            if (fromEl.getAttribute(attr.name) !== attr.value) {
                fromEl.setAttribute(attr.name, attr.value);
            }
        }
    }

    /**
     * Cache refs after render
     */
    _cacheRefs() {
        this._refs = {};
        this.shadowRoot.querySelectorAll('[ref]').forEach(el => {
            this._refs[el.getAttribute('ref')] = el;
        });
    }

    /**
     * Get a ref by name
     * @param {string} name - Ref name
     * @returns {Element|null}
     */
    ref(name) {
        return this._refs[name] || null;
    }

    /**
     * Query element in shadow DOM
     * @param {string} selector - CSS selector
     * @returns {Element|null}
     */
    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    /**
     * Query all elements in shadow DOM
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    /**
     * Add event listener with tracking to prevent duplicates across renders.
     * Use this in afterRender() instead of direct addEventListener.
     *
     * @param {Element} element - Target element
     * @param {string} event - Event name (e.g., 'click')
     * @param {Function} handler - Event handler function
     * @param {Object} [options] - addEventListener options
     * @returns {Function|null} Cleanup function to remove the listener
     */
    addListener(element, event, handler, options) {
        if (!element) return null;

        let map = this._attachedListeners.get(element);
        if (!map) {
            map = new Map();
            this._attachedListeners.set(element, map);
        }

        const key = `${event}-${JSON.stringify(options || {})}`;
        const existing = map.get(key);

        // Remove existing listener for this event/options combo
        if (existing) {
            element.removeEventListener(event, existing.handler, existing.options);
        }

        // Add new listener
        element.addEventListener(event, handler, options);
        map.set(key, { handler, options });

        // Return cleanup function
        return () => {
            element.removeEventListener(event, handler, options);
            map.delete(key);
        };
    }

    /**
     * Emit custom event
     * @param {string} name - Event name
     * @param {*} detail - Event detail data
     * @param {Object} options - Event options
     */
    emit(name, detail = null, options = {}) {
        this.dispatchEvent(new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true,
            ...options
        }));
    }

    /**
     * Subscribe to store changes
     * @param {Object} store - Store instance
     * @param {string} key - State key to subscribe to
     * @param {Function} callback - Callback function
     */
    subscribe(store, key, callback) {
        const unsubscribe = store.subscribe(key, callback);
        this._subscriptions.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Lifecycle: called when element is connected to DOM
     */
    connectedCallback() {
        this._connected = true;
        this.onConnect();
        this.render();
    }

    /**
     * Lifecycle: called when element is disconnected from DOM
     */
    disconnectedCallback() {
        this._connected = false;
        this._subscriptions.forEach(unsub => unsub());
        this._subscriptions = [];
        this._hasRendered = false;
        this._lastTemplate = null;
        this.onDisconnect();
    }

    /**
     * Lifecycle: called when an observed attribute changes
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.onAttributeChange(name, oldValue, newValue);
            if (this._connected) {
                this.render();
            }
        }
    }

    // Override these hooks in subclasses

    /**
     * Called when component connects to DOM
     */
    onConnect() {}

    /**
     * Called when component disconnects from DOM
     */
    onDisconnect() {}

    /**
     * Called after render completes
     */
    afterRender() {}

    /**
     * Called when state changes
     * @param {Object} oldState
     * @param {Object} newState
     */
    onStateChange(oldState, newState) {}

    /**
     * Called when observed attribute changes
     * @param {string} name
     * @param {*} oldValue
     * @param {*} newValue
     */
    onAttributeChange(name, oldValue, newValue) {}

    /**
     * Helper: escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper: format status labels
     * @param {string} status
     * @returns {string}
     */
    formatStatus(status) {
        const labels = {
            finished: 'Finished',
            reading: 'Reading',
            queued: 'Queued',
            want_to_read: 'Want to Read',
            abandoned: 'DNF',
        };
        return labels[status] || status;
    }

    /**
     * Helper: render star rating
     * @param {number} rating
     * @returns {string}
     */
    renderStars(rating) {
        return '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
    }

    /**
     * Helper: debounce function calls
     * @param {Function} fn
     * @param {number} delay
     * @returns {Function}
     */
    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }
}

/**
 * Define a custom element
 * @param {string} name - Element name (must include hyphen)
 * @param {typeof BaseComponent} ComponentClass - Component class
 */
export function defineComponent(name, ComponentClass) {
    if (!customElements.get(name)) {
        customElements.define(name, ComponentClass);
    }
}
