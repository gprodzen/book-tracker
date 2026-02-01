/**
 * BaseComponent - Base class for all Web Components
 * Provides Shadow DOM encapsulation, reactive state, and lifecycle management
 */

export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this._state = {};
        this._refs = {};
        this._subscriptions = [];
        this._connected = false;

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
     * Render the component
     */
    render() {
        const styles = this.styles();
        const template = this.template();

        this.shadowRoot.innerHTML = `
            ${styles ? `<style>${styles}</style>` : ''}
            ${template}
        `;

        this._cacheRefs();
        this.afterRender();
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
            owned: 'Owned',
            interested: 'Interested',
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
