/**
 * Book Tracker SPA - Main Application
 * Router, State Management, and API Client
 */

const API_BASE = 'http://localhost:5001/api';

// ============================================
// State Management
// ============================================

const state = {
    currentView: 'dashboard',
    books: [],
    total: 0,
    page: 1,
    perPage: 50,
    pages: 1,
    status: '',
    search: '',
    sort: 'date_added',
    order: 'desc',
    stats: null,
    dashboard: null,
    pipeline: null,
    paths: [],
    settings: { wip_limit: 5 },
    selectedBook: null,
    selectedPath: null,
};

// ============================================
// API Client
// ============================================

const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async patch(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok && response.status !== 204) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    },

    // Dashboard
    async getDashboard() {
        return this.get('/dashboard');
    },

    // Pipeline
    async getPipeline() {
        return this.get('/pipeline');
    },

    // Books
    async getBooks(params = {}) {
        const query = new URLSearchParams({
            page: params.page || 1,
            per_page: params.perPage || 50,
            sort: params.sort || 'date_added',
            order: params.order || 'desc',
        });
        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);
        return this.get(`/books?${query}`);
    },

    async getBook(bookId) {
        return this.get(`/books/${bookId}`);
    },

    async updateBook(bookId, data) {
        return this.patch(`/books/${bookId}`, data);
    },

    // Learning Paths
    async getPaths() {
        return this.get('/paths');
    },

    async getPath(pathId) {
        return this.get(`/paths/${pathId}`);
    },

    async createPath(data) {
        return this.post('/paths', data);
    },

    async updatePath(pathId, data) {
        return this.patch(`/paths/${pathId}`, data);
    },

    async deletePath(pathId) {
        return this.delete(`/paths/${pathId}`);
    },

    async addBookToPath(pathId, userBookId) {
        return this.post(`/paths/${pathId}/books`, { user_book_id: userBookId });
    },

    async removeBookFromPath(pathId, userBookId) {
        return this.delete(`/paths/${pathId}/books/${userBookId}`);
    },

    async reorderPathBooks(pathId, books) {
        return this.patch(`/paths/${pathId}/books/reorder`, { books });
    },

    // Stats
    async getStats() {
        return this.get('/stats');
    },

    // Settings
    async getSettings() {
        return this.get('/settings');
    },

    async updateSettings(data) {
        return this.patch('/settings', data);
    },

    // Enrich
    async enrichBooks() {
        return this.post('/books/enrich-all', {});
    },
};

// ============================================
// Router
// ============================================

const routes = {
    dashboard: 'dashboard',
    pipeline: 'pipeline',
    paths: 'paths',
    library: 'library',
};

function getRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    return routes[hash] || 'dashboard';
}

function navigate(route) {
    window.location.hash = route;
}

function handleRouteChange() {
    const route = getRoute();
    state.currentView = route;
    updateNavigation();
    renderView();
}

function updateNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        const route = link.dataset.route;
        link.classList.toggle('active', route === state.currentView);
    });
}

// ============================================
// View Rendering
// ============================================

async function renderView() {
    const container = document.getElementById('view-container');

    switch (state.currentView) {
        case 'dashboard':
            await renderDashboard(container);
            break;
        case 'pipeline':
            await renderPipeline(container);
            break;
        case 'paths':
            await renderPaths(container);
            break;
        case 'library':
            await renderLibrary(container);
            break;
        default:
            container.innerHTML = '<div class="empty-state">View not found</div>';
    }
}

// ============================================
// Utility Functions
// ============================================

function formatStatus(status) {
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

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderCover(book) {
    if (book.cover_image_url) {
        return `<img src="${book.cover_image_url}" alt="${escapeHtml(book.title)}" loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div class="placeholder" style="display:none">${escapeHtml(book.title)}</div>`;
    }
    return `<div class="placeholder">${escapeHtml(book.title)}</div>`;
}

function renderStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ============================================
// Modal Management
// ============================================

function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function hideModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

async function showBookDetail(bookId) {
    try {
        const book = await api.getBook(bookId);
        state.selectedBook = book;

        const pathsHtml = book.tags && book.tags.length
            ? `<div class="tags-list">${book.tags.map(t => `<span class="tag">${escapeHtml(t.name)}</span>`).join('')}</div>`
            : '';

        const progressSection = book.status === 'reading' ? `
            <div class="progress-update">
                <h3>Update Progress</h3>
                <div class="progress-inputs">
                    <div class="progress-input-group">
                        <label>Current Page</label>
                        <input type="number" id="progress-page" value="${book.current_page || 0}" min="0" max="${book.page_count || 9999}">
                    </div>
                    <div class="progress-input-group">
                        <label>of ${book.page_count || '?'} pages</label>
                    </div>
                    <button class="primary" onclick="updateProgress(${book.book_id})">Save</button>
                </div>
            </div>
        ` : '';

        const content = `
            <div class="book-detail">
                <div class="book-detail-cover">
                    ${renderCover(book)}
                </div>
                <div class="book-detail-info">
                    <h2>${escapeHtml(book.title)}</h2>
                    <div class="author">${escapeHtml(book.author)}${book.additional_authors ? `, ${escapeHtml(book.additional_authors)}` : ''}</div>

                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <select id="book-status" onchange="updateBookStatus(${book.book_id}, this.value)">
                            ${['interested', 'owned', 'queued', 'reading', 'finished', 'abandoned'].map(s =>
                                `<option value="${s}" ${book.status === s ? 'selected' : ''}>${formatStatus(s)}</option>`
                            ).join('')}
                        </select>
                    </div>

                    ${book.status === 'reading' ? `
                        <div class="detail-row">
                            <span class="detail-label">Progress</span>
                            <span>${book.progress_percent || 0}%</span>
                        </div>
                    ` : ''}

                    ${book.my_rating ? `
                        <div class="detail-row">
                            <span class="detail-label">My Rating</span>
                            <span class="book-rating">${renderStars(book.my_rating)}</span>
                        </div>
                    ` : ''}

                    ${book.page_count ? `
                        <div class="detail-row">
                            <span class="detail-label">Pages</span>
                            <span>${book.page_count}</span>
                        </div>
                    ` : ''}

                    ${book.year_published ? `
                        <div class="detail-row">
                            <span class="detail-label">Published</span>
                            <span>${book.year_published}</span>
                        </div>
                    ` : ''}

                    ${book.why_reading ? `
                        <div class="detail-row">
                            <span class="detail-label">Why Reading</span>
                            <span>${escapeHtml(book.why_reading)}</span>
                        </div>
                    ` : ''}

                    ${pathsHtml}

                    ${book.description ? `
                        <div class="book-description">${escapeHtml(book.description)}</div>
                    ` : ''}

                    ${progressSection}
                </div>
            </div>
        `;

        showModal(book.title, content);
    } catch (error) {
        console.error('Error loading book:', error);
    }
}

async function updateBookStatus(bookId, newStatus) {
    try {
        await api.updateBook(bookId, { status: newStatus });
        hideModal();
        renderView();
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function updateProgress(bookId) {
    const pageInput = document.getElementById('progress-page');
    const currentPage = parseInt(pageInput.value, 10);

    try {
        await api.updateBook(bookId, { current_page: currentPage });
        hideModal();
        renderView();
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

// ============================================
// Event Handlers
// ============================================

function setupGlobalEventListeners() {
    // Modal close handlers
    document.getElementById('modal-close').addEventListener('click', hideModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') hideModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });

    // Route change handler
    window.addEventListener('hashchange', handleRouteChange);

    // Navigation clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(link.dataset.route);
        });
    });
}

// ============================================
// Initialize
// ============================================

async function init() {
    setupGlobalEventListeners();

    // Load settings
    try {
        state.settings = await api.getSettings();
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    handleRouteChange();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
