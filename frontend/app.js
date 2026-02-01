/**
 * Book Tracker SPA - Main Application
 * Router, State Management, and API Client
 */

// API base URL - use relative URL for production, absolute for development
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : '/api';

// ============================================
// State Management
// ============================================

const state = {
    authenticated: false,
    passwordRequired: true,
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
    addBookSourceId: null, // For linking new books to a source book
};

// ============================================
// API Client
// ============================================

const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            credentials: 'include',
        });
        if (response.status === 401) {
            state.authenticated = false;
            showLoginScreen();
            throw new Error('Authentication required');
        }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (response.status === 401) {
            state.authenticated = false;
            showLoginScreen();
            throw new Error('Authentication required');
        }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async patch(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (response.status === 401) {
            state.authenticated = false;
            showLoginScreen();
            throw new Error('Authentication required');
        }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (response.status === 401) {
            state.authenticated = false;
            showLoginScreen();
            throw new Error('Authentication required');
        }
        if (!response.ok && response.status !== 204) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    },

    // Auth
    async checkAuth() {
        const response = await fetch(`${API_BASE}/auth/check`, {
            credentials: 'include',
        });
        return response.json();
    },

    async login(password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include',
        });
        return response.json();
    },

    async logout() {
        return this.post('/auth/logout', {});
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

    async createBook(data) {
        return this.post('/books', data);
    },

    async updateBook(bookId, data) {
        return this.patch(`/books/${bookId}`, data);
    },

    // Open Library Search
    async searchOpenLibrary(query) {
        return this.get(`/search/openlibrary?q=${encodeURIComponent(query)}&limit=10`);
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
// Authentication
// ============================================

function showLoginScreen() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h1>Book Tracker</h1>
                <p>Enter your password to continue</p>
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <input type="password" id="login-password" placeholder="Password" required autofocus>
                    </div>
                    <div id="login-error" class="login-error" style="display: none;"></div>
                    <button type="submit" class="primary login-btn">Sign In</button>
                </form>
            </div>
        </div>
    `;
}

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const result = await api.login(password);
        if (result.success) {
            state.authenticated = true;
            errorEl.style.display = 'none';
            handleRouteChange();
        } else {
            errorEl.textContent = result.error || 'Invalid password';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Invalid password';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    await api.logout();
    state.authenticated = false;
    showLoginScreen();
}

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
    if (!state.authenticated && state.passwordRequired) {
        showLoginScreen();
        return;
    }

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
    if (!text) return '';
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
    state.addBookSourceId = null;
}

async function showBookDetail(bookId) {
    try {
        const book = await api.getBook(bookId);
        state.selectedBook = book;

        const pathsHtml = book.paths && book.paths.length
            ? `<div class="detail-row">
                   <span class="detail-label">Learning Paths</span>
                   <span>${book.paths.map(p => `<span class="path-tag" style="border-left: 2px solid ${p.color}">${escapeHtml(p.name)}</span>`).join(' ')}</span>
               </div>`
            : '';

        const tagsHtml = book.tags && book.tags.length
            ? `<div class="tags-list">${book.tags.map(t => `<span class="tag">${escapeHtml(t.name)}</span>`).join('')}</div>`
            : '';

        // Source book link
        const sourceBookHtml = book.source_book
            ? `<div class="detail-row">
                   <span class="detail-label">Sparked from</span>
                   <span><a href="#" onclick="showBookDetail(${book.source_book.book_id}); return false;" class="source-link">${escapeHtml(book.source_book.title)}</a> by ${escapeHtml(book.source_book.author)}</span>
               </div>`
            : '';

        // Books sparked from this
        const sparkedBooksHtml = book.sparked_books && book.sparked_books.length
            ? `<div class="sparked-books">
                   <h4>Books sparked from this:</h4>
                   <ul>
                       ${book.sparked_books.map(b =>
                           `<li><a href="#" onclick="showBookDetail(${b.book_id}); return false;">${escapeHtml(b.title)}</a> <span class="status-badge status-${b.status}">${formatStatus(b.status)}</span></li>`
                       ).join('')}
                   </ul>
               </div>`
            : '';

        // Idea source
        const ideaSourceHtml = book.idea_source
            ? `<div class="detail-row">
                   <span class="detail-label">Idea source</span>
                   <span>${escapeHtml(book.idea_source)}</span>
               </div>`
            : '';

        // Format ownership checkboxes
        const formatHtml = `
            <div class="format-ownership">
                <h4>Format Ownership</h4>
                <label class="format-checkbox">
                    <input type="checkbox" id="owns-kindle" ${book.owns_kindle ? 'checked' : ''} onchange="updateBookFormat(${book.book_id}, 'owns_kindle', this.checked)">
                    <span>Kindle</span>
                </label>
                <label class="format-checkbox">
                    <input type="checkbox" id="owns-audible" ${book.owns_audible ? 'checked' : ''} onchange="updateBookFormat(${book.book_id}, 'owns_audible', this.checked)">
                    <span>Audible</span>
                </label>
                <label class="format-checkbox">
                    <input type="checkbox" id="owns-hardcopy" ${book.owns_hardcopy ? 'checked' : ''} onchange="updateBookFormat(${book.book_id}, 'owns_hardcopy', this.checked)">
                    <span>Physical</span>
                </label>
            </div>
        `;

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

                    ${sourceBookHtml}
                    ${ideaSourceHtml}
                    ${pathsHtml}
                    ${tagsHtml}

                    ${formatHtml}

                    ${book.description ? `
                        <div class="book-description">${escapeHtml(book.description)}</div>
                    ` : ''}

                    ${progressSection}

                    ${sparkedBooksHtml}

                    <div class="book-detail-actions">
                        <button onclick="showAddBookModal(${book.book_id})">+ Add book sparked from this</button>
                    </div>
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

async function updateBookFormat(bookId, field, value) {
    try {
        await api.updateBook(bookId, { [field]: value });
    } catch (error) {
        console.error('Error updating format:', error);
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
// Add Book Modal
// ============================================

function showAddBookModal(sourceBookId = null) {
    state.addBookSourceId = sourceBookId;

    const content = `
        <div class="add-book-modal">
            <div class="add-book-tabs">
                <button class="tab-btn active" onclick="showAddBookTab('search')">Search Open Library</button>
                <button class="tab-btn" onclick="showAddBookTab('manual')">Manual Entry</button>
            </div>

            <div id="add-book-search" class="add-book-tab active">
                <div class="form-group">
                    <label>Search for a book</label>
                    <input type="text" id="book-search-input" placeholder="Title, author, or ISBN..." oninput="handleBookSearch()">
                </div>
                <div id="search-results" class="search-results"></div>
            </div>

            <div id="add-book-manual" class="add-book-tab" style="display: none;">
                <form id="manual-book-form" onsubmit="handleManualBookAdd(event)">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="manual-title" required>
                    </div>
                    <div class="form-group">
                        <label>Author *</label>
                        <input type="text" id="manual-author" required>
                    </div>
                    <div class="form-group">
                        <label>ISBN</label>
                        <input type="text" id="manual-isbn">
                    </div>
                    <div class="form-group">
                        <label>Page Count</label>
                        <input type="number" id="manual-pages" min="1">
                    </div>
                    <div class="form-group">
                        <label>Year Published</label>
                        <input type="number" id="manual-year" min="1000" max="2100">
                    </div>
                    <div class="form-group">
                        <label>Initial Status</label>
                        <select id="manual-status">
                            <option value="interested">Interested</option>
                            <option value="owned">Owned</option>
                            <option value="queued">Queued</option>
                            <option value="reading">Reading</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Idea Source</label>
                        <textarea id="manual-idea-source" placeholder="Where did you hear about this book?"></textarea>
                    </div>
                    ${sourceBookId ? `<p class="source-book-note">This book will be linked as sparked from the book you were viewing.</p>` : ''}
                    <div class="form-actions">
                        <button type="button" onclick="hideModal()">Cancel</button>
                        <button type="submit" class="primary">Add Book</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    showModal('Add Book', content);
}

function showAddBookTab(tab) {
    document.querySelectorAll('.add-book-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`add-book-${tab}`).style.display = 'block';
    event.target.classList.add('active');
}

const handleBookSearch = debounce(async () => {
    const query = document.getElementById('book-search-input').value.trim();
    const resultsEl = document.getElementById('search-results');

    if (query.length < 2) {
        resultsEl.innerHTML = '';
        return;
    }

    resultsEl.innerHTML = '<div class="loading">Searching...</div>';

    try {
        const data = await api.searchOpenLibrary(query);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<div class="empty-state">No books found. Try a different search or add manually.</div>';
            return;
        }

        resultsEl.innerHTML = data.results.map(book => `
            <div class="search-result-item" onclick="selectSearchResult(${JSON.stringify(book).replace(/"/g, '&quot;')})">
                <div class="search-result-cover">
                    ${book.cover_image_url
                        ? `<img src="${book.cover_image_medium || book.cover_image_url}" alt="${escapeHtml(book.title)}">`
                        : `<div class="placeholder">${escapeHtml(book.title)}</div>`
                    }
                </div>
                <div class="search-result-info">
                    <div class="search-result-title">${escapeHtml(book.title)}</div>
                    <div class="search-result-author">${escapeHtml(book.authors ? book.authors.join(', ') : 'Unknown')}</div>
                    ${book.first_publish_year ? `<div class="search-result-year">${book.first_publish_year}</div>` : ''}
                    ${book.page_count ? `<div class="search-result-pages">${book.page_count} pages</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        resultsEl.innerHTML = '<div class="empty-state">Error searching. Please try again.</div>';
        console.error('Search error:', error);
    }
}, 500);

async function selectSearchResult(book) {
    // Show confirmation/additional info form
    const content = `
        <div class="add-book-confirm">
            <div class="confirm-book-info">
                <div class="confirm-cover">
                    ${book.cover_image_url
                        ? `<img src="${book.cover_image_url}" alt="${escapeHtml(book.title)}">`
                        : `<div class="placeholder">${escapeHtml(book.title)}</div>`
                    }
                </div>
                <div class="confirm-details">
                    <h3>${escapeHtml(book.title)}</h3>
                    <p class="author">${escapeHtml(book.authors ? book.authors.join(', ') : 'Unknown')}</p>
                    ${book.first_publish_year ? `<p>Published: ${book.first_publish_year}</p>` : ''}
                    ${book.page_count ? `<p>${book.page_count} pages</p>` : ''}
                </div>
            </div>
            <form id="confirm-book-form" onsubmit="handleConfirmBookAdd(event)">
                <input type="hidden" id="confirm-title" value="${escapeHtml(book.title)}">
                <input type="hidden" id="confirm-author" value="${escapeHtml(book.authors ? book.authors[0] : 'Unknown')}">
                <input type="hidden" id="confirm-additional-authors" value="${escapeHtml(book.authors ? book.authors.slice(1).join(', ') : '')}">
                <input type="hidden" id="confirm-isbn" value="${book.isbn_10 || ''}">
                <input type="hidden" id="confirm-isbn13" value="${book.isbn_13 || ''}">
                <input type="hidden" id="confirm-pages" value="${book.page_count || ''}">
                <input type="hidden" id="confirm-year" value="${book.first_publish_year || ''}">
                <input type="hidden" id="confirm-cover" value="${book.cover_image_url || ''}">
                <input type="hidden" id="confirm-ol-key" value="${book.open_library_key || ''}">

                <div class="form-group">
                    <label>Initial Status</label>
                    <select id="confirm-status">
                        <option value="interested">Interested</option>
                        <option value="owned">Owned</option>
                        <option value="queued">Queued</option>
                        <option value="reading">Reading</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Idea Source</label>
                    <textarea id="confirm-idea-source" placeholder="Where did you hear about this book?"></textarea>
                </div>
                ${state.addBookSourceId ? `<p class="source-book-note">This book will be linked as sparked from the previous book.</p>` : ''}
                <div class="form-actions">
                    <button type="button" onclick="showAddBookModal(${state.addBookSourceId || 'null'})">Back</button>
                    <button type="submit" class="primary">Add to Library</button>
                </div>
            </form>
        </div>
    `;

    showModal('Add Book', content);
}

async function handleConfirmBookAdd(e) {
    e.preventDefault();

    const bookData = {
        title: document.getElementById('confirm-title').value,
        author: document.getElementById('confirm-author').value,
        additional_authors: document.getElementById('confirm-additional-authors').value || null,
        isbn: document.getElementById('confirm-isbn').value || null,
        isbn13: document.getElementById('confirm-isbn13').value || null,
        page_count: parseInt(document.getElementById('confirm-pages').value) || null,
        year_published: parseInt(document.getElementById('confirm-year').value) || null,
        cover_image_url: document.getElementById('confirm-cover').value || null,
        open_library_key: document.getElementById('confirm-ol-key').value || null,
        status: document.getElementById('confirm-status').value,
        idea_source: document.getElementById('confirm-idea-source').value || null,
        source_book_id: state.addBookSourceId || null,
    };

    try {
        await api.createBook(bookData);
        hideModal();
        renderView();
    } catch (error) {
        if (error.message.includes('409')) {
            alert('This book is already in your library.');
        } else {
            alert('Error adding book. Please try again.');
        }
        console.error('Error adding book:', error);
    }
}

async function handleManualBookAdd(e) {
    e.preventDefault();

    const bookData = {
        title: document.getElementById('manual-title').value,
        author: document.getElementById('manual-author').value,
        isbn: document.getElementById('manual-isbn').value || null,
        page_count: parseInt(document.getElementById('manual-pages').value) || null,
        year_published: parseInt(document.getElementById('manual-year').value) || null,
        status: document.getElementById('manual-status').value,
        idea_source: document.getElementById('manual-idea-source').value || null,
        source_book_id: state.addBookSourceId || null,
    };

    try {
        await api.createBook(bookData);
        hideModal();
        renderView();
    } catch (error) {
        if (error.message.includes('409')) {
            alert('This book is already in your library.');
        } else {
            alert('Error adding book. Please try again.');
        }
        console.error('Error adding book:', error);
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

    // FAB button
    const fab = document.getElementById('fab-add-book');
    if (fab) {
        fab.addEventListener('click', () => showAddBookModal());
    }
}

// ============================================
// Initialize
// ============================================

async function init() {
    setupGlobalEventListeners();

    // Check authentication state
    try {
        const authState = await api.checkAuth();
        state.authenticated = authState.authenticated;
        state.passwordRequired = authState.password_required;

        if (!state.passwordRequired) {
            state.authenticated = true;
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        state.authenticated = false;
        state.passwordRequired = true;
    }

    // Load settings if authenticated
    if (state.authenticated) {
        try {
            state.settings = await api.getSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    handleRouteChange();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
