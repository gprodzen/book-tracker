/**
 * Dashboard View
 * The "command center" showing currently reading books, learning paths progress, and queue
 */

async function renderDashboard(container) {
    container.innerHTML = '<div class="loading">Loading dashboard...</div>';

    try {
        const data = await api.getDashboard();
        state.dashboard = data;

        const { currently_reading, queued, learning_paths, wip_limit, reading_count } = data;

        // WIP limit indicator
        let wipClass = '';
        if (reading_count >= wip_limit) wipClass = 'over';
        else if (reading_count >= wip_limit - 1) wipClass = 'warning';

        container.innerHTML = `
            <!-- Currently Reading Section -->
            <section class="dashboard-section">
                <div class="section-header">
                    <h2 class="section-title">Currently Reading</h2>
                    <span class="wip-indicator ${wipClass}">${reading_count} of ${wip_limit} limit</span>
                </div>
                ${currently_reading.length > 0 ? `
                    <div class="reading-row">
                        ${currently_reading.map(book => renderReadingCard(book)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>No books in progress</p>
                        <p style="font-size: 0.8rem; margin-top: 8px;">Move a book to "Reading" to get started</p>
                    </div>
                `}
            </section>

            <!-- Learning Paths Section -->
            <section class="dashboard-section">
                <div class="section-header">
                    <h2 class="section-title">Learning Paths</h2>
                    <button onclick="navigate('paths')">View All</button>
                </div>
                ${learning_paths.length > 0 ? `
                    <div class="paths-grid">
                        ${learning_paths.map(path => renderPathCard(path)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>No learning paths yet</p>
                        <button class="primary" onclick="showCreatePathModal()" style="margin-top: 12px;">
                            Create Your First Path
                        </button>
                    </div>
                `}
            </section>

            <!-- Queued Up Section -->
            <section class="dashboard-section">
                <div class="section-header">
                    <h2 class="section-title">Queued Up</h2>
                    <button onclick="navigate('pipeline')">View Pipeline</button>
                </div>
                ${queued.length > 0 ? `
                    <div class="books-grid">
                        ${queued.slice(0, 6).map(book => renderQueuedCard(book)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>No books in queue</p>
                        <p style="font-size: 0.8rem; margin-top: 8px;">Add books to your queue from the Library or Pipeline view</p>
                    </div>
                `}
            </section>
        `;

        // Add click handlers for book cards
        container.querySelectorAll('[data-book-id]').forEach(card => {
            card.addEventListener('click', () => showBookDetail(card.dataset.bookId));
        });

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Failed to load dashboard</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">Make sure the backend is running on port 5001</p>
            </div>
        `;
        console.error('Dashboard error:', error);
    }
}

function renderReadingCard(book) {
    const progress = book.progress_percent || 0;
    const isStale = book.is_stale === 1;

    // Get first path if any
    const pathBadge = book.paths && book.paths.length > 0
        ? `<span class="path-badge" style="border-left: 2px solid ${book.paths[0].color}">${escapeHtml(book.paths[0].name)}</span>`
        : '';

    return `
        <div class="reading-card" data-book-id="${book.book_id}">
            <div class="book-cover">
                ${renderCover(book)}
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="progress-info">
                    <span>${progress}%</span>
                    ${isStale ? '<span class="stale-indicator">Stale</span>' : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill ${progress === 100 ? 'complete' : ''}" style="width: ${progress}%"></div>
                </div>
                ${pathBadge}
            </div>
        </div>
    `;
}

function renderPathCard(path) {
    const total = path.total_books || 0;
    const completed = path.completed_books || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return `
        <div class="path-card" onclick="navigate('paths')">
            <div class="path-card-header">
                <div class="path-name">
                    <span class="path-icon" style="background: ${path.color}"></span>
                    ${escapeHtml(path.name)}
                </div>
                <span class="path-progress-text">${completed}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill ${progress === 100 ? 'complete' : ''}" style="width: ${progress}%"></div>
            </div>
            ${path.next_book ? `
                <div class="path-next">Next: <strong>${escapeHtml(path.next_book)}</strong></div>
            ` : ''}
        </div>
    `;
}

function renderQueuedCard(book) {
    return `
        <div class="book-card" data-book-id="${book.book_id}">
            <div class="book-cover">
                ${renderCover(book)}
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author)}</div>
                <div class="book-meta">
                    <span class="status-badge status-queued">Queued</span>
                    ${book.priority > 0 ? `<span>Priority: ${book.priority}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}
