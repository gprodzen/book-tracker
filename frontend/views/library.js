/**
 * Library View
 * Enhanced grid view of all books with filters and search
 */

async function renderLibrary(container) {
    container.innerHTML = '<div class="loading">Loading library...</div>';

    try {
        // Fetch stats for filter counts
        const stats = await api.getStats();
        state.stats = stats;

        // Render controls first
        container.innerHTML = `
            <div class="controls">
                <div class="search-box">
                    <input type="text" id="search-input" placeholder="Search books by title or author..." value="${state.search}">
                </div>
                <div class="filter-tabs" id="filter-tabs">
                    <button class="filter-tab ${state.status === '' ? 'active' : ''}" data-status="">All <span class="count">${stats.total_books}</span></button>
                    <button class="filter-tab ${state.status === 'finished' ? 'active' : ''}" data-status="finished">Finished <span class="count">${stats.by_status?.finished || 0}</span></button>
                    <button class="filter-tab ${state.status === 'reading' ? 'active' : ''}" data-status="reading">Reading <span class="count">${stats.by_status?.reading || 0}</span></button>
                    <button class="filter-tab ${state.status === 'queued' ? 'active' : ''}" data-status="queued">Queued <span class="count">${stats.by_status?.queued || 0}</span></button>
                    <button class="filter-tab ${state.status === 'owned' ? 'active' : ''}" data-status="owned">Owned <span class="count">${stats.by_status?.owned || 0}</span></button>
                    <button class="filter-tab ${state.status === 'interested' ? 'active' : ''}" data-status="interested">Interested <span class="count">${stats.by_status?.interested || 0}</span></button>
                </div>
                <select id="sort-select">
                    <option value="date_added-desc" ${state.sort === 'date_added' && state.order === 'desc' ? 'selected' : ''}>Recently Added</option>
                    <option value="date_added-asc" ${state.sort === 'date_added' && state.order === 'asc' ? 'selected' : ''}>Oldest Added</option>
                    <option value="finished_reading_at-desc" ${state.sort === 'finished_reading_at' ? 'selected' : ''}>Recently Read</option>
                    <option value="title-asc" ${state.sort === 'title' && state.order === 'asc' ? 'selected' : ''}>Title A-Z</option>
                    <option value="title-desc" ${state.sort === 'title' && state.order === 'desc' ? 'selected' : ''}>Title Z-A</option>
                    <option value="author-asc" ${state.sort === 'author' ? 'selected' : ''}>Author A-Z</option>
                    <option value="my_rating-desc" ${state.sort === 'my_rating' ? 'selected' : ''}>Highest Rated</option>
                    <option value="priority-desc" ${state.sort === 'priority' ? 'selected' : ''}>Priority</option>
                    <option value="page_count-desc" ${state.sort === 'page_count' ? 'selected' : ''}>Most Pages</option>
                    <option value="year_published-desc" ${state.sort === 'year_published' ? 'selected' : ''}>Newest Published</option>
                </select>
                <button id="enrich-btn" class="primary">Enhance Covers</button>
            </div>
            <div id="books-container">
                <div class="loading">Loading books...</div>
            </div>
            <div class="pagination" id="pagination" style="display: none;">
                <button id="prev-btn">Previous</button>
                <span class="page-info" id="page-info"></span>
                <button id="next-btn">Next</button>
            </div>
        `;

        // Set up event listeners
        setupLibraryEventListeners();

        // Fetch and render books
        await fetchAndRenderBooks();

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Failed to load library</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">Make sure the backend is running on port 5001</p>
            </div>
        `;
        console.error('Library error:', error);
    }
}

async function fetchAndRenderBooks() {
    const booksContainer = document.getElementById('books-container');
    booksContainer.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const data = await api.getBooks({
            page: state.page,
            perPage: state.perPage,
            sort: state.sort,
            order: state.order,
            status: state.status,
            search: state.search,
        });

        state.books = data.books;
        state.total = data.total;
        state.pages = data.pages;

        renderBookGrid(booksContainer, data.books);
        updatePagination();

    } catch (error) {
        booksContainer.innerHTML = '<div class="empty-state">Failed to load books</div>';
        console.error('Error fetching books:', error);
    }
}

function renderBookGrid(container, books) {
    if (books.length === 0) {
        container.innerHTML = '<div class="empty-state">No books found</div>';
        return;
    }

    container.innerHTML = `
        <div class="books-grid">
            ${books.map(book => renderLibraryCard(book)).join('')}
        </div>
    `;

    // Add click handlers
    container.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => showBookDetail(card.dataset.bookId));
    });
}

function renderLibraryCard(book) {
    const progress = book.progress_percent || 0;

    return `
        <div class="book-card" data-book-id="${book.book_id}">
            <div class="book-cover">
                ${renderCover(book)}
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author)}</div>
                ${book.status === 'reading' ? `
                    <div class="progress-bar" style="margin-bottom: 8px;">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                ` : ''}
                <div class="book-meta">
                    <span class="status-badge status-${book.status}">${formatStatus(book.status)}</span>
                    ${book.my_rating ? `<span class="book-rating">${'★'.repeat(book.my_rating)}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (state.pages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${state.page} of ${state.pages}`;
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= state.pages;
}

function setupLibraryEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(() => {
        state.search = searchInput.value;
        state.page = 1;
        fetchAndRenderBooks();
    }, 300));

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.status = tab.dataset.status;
            state.page = 1;
            fetchAndRenderBooks();
        });
    });

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', () => {
        const [sort, order] = sortSelect.value.split('-');
        state.sort = sort;
        state.order = order;
        state.page = 1;
        fetchAndRenderBooks();
    });

    // Pagination
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (state.page > 1) {
            state.page--;
            fetchAndRenderBooks();
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (state.page < state.pages) {
            state.page++;
            fetchAndRenderBooks();
        }
    });

    // Enrich button
    document.getElementById('enrich-btn').addEventListener('click', async () => {
        const btn = document.getElementById('enrich-btn');
        btn.disabled = true;
        btn.textContent = 'Enhancing...';

        try {
            const result = await api.enrichBooks();
            alert(`Enhanced ${result.enriched} covers from Open Library.\n${result.failed} books not found.\n${result.remaining} remaining to enhance.`);
            fetchAndRenderBooks();
        } catch (error) {
            alert('Error enhancing books');
            console.error('Error:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enhance Covers';
        }
    });
}
