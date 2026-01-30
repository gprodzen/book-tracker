/**
 * Learning Paths View
 * Manage topic-specific reading lists tied to projects/goals
 */

async function renderPaths(container) {
    container.innerHTML = '<div class="loading">Loading learning paths...</div>';

    try {
        const paths = await api.getPaths();
        state.paths = paths;

        container.innerHTML = `
            <div class="section-header" style="margin-bottom: 24px;">
                <h1>Learning Paths</h1>
                <button class="primary" onclick="showCreatePathModal()">+ New Path</button>
            </div>

            ${paths.length > 0 ? `
                <div class="paths-list">
                    ${await Promise.all(paths.map(path => renderPathItem(path))).then(items => items.join(''))}
                </div>
            ` : `
                <div class="empty-state">
                    <p>No learning paths yet</p>
                    <p style="font-size: 0.875rem; margin-top: 8px; margin-bottom: 16px;">
                        Create learning paths to organize your reading around topics or goals.
                    </p>
                    <button class="primary" onclick="showCreatePathModal()">Create Your First Path</button>
                </div>
            `}
        `;

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Failed to load learning paths</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">Make sure the backend is running on port 5001</p>
            </div>
        `;
        console.error('Paths error:', error);
    }
}

async function renderPathItem(path) {
    // Fetch full path details with books
    let pathDetails;
    try {
        pathDetails = await api.getPath(path.id);
    } catch (e) {
        pathDetails = path;
        pathDetails.books = [];
    }

    const total = pathDetails.total_books || 0;
    const completed = pathDetails.completed_books || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const books = pathDetails.books || [];

    return `
        <div class="path-item" data-path-id="${path.id}">
            <div class="path-item-header">
                <div class="path-item-title">
                    <span class="path-icon" style="background: ${path.color}; width: 12px; height: 12px;"></span>
                    ${escapeHtml(path.name)}
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="path-item-progress">${completed}/${total} complete</span>
                    <button onclick="showEditPathModal(${path.id})">Edit</button>
                    <button onclick="confirmDeletePath(${path.id})">Delete</button>
                </div>
            </div>

            <div class="progress-bar" style="margin-bottom: 16px;">
                <div class="progress-bar-fill ${progress === 100 ? 'complete' : ''}" style="width: ${progress}%"></div>
            </div>

            ${path.description ? `<p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">${escapeHtml(path.description)}</p>` : ''}

            <div class="path-item-books">
                ${books.map(book => {
                    let icon = '○';
                    let className = 'pending';
                    if (book.status === 'finished') {
                        icon = '✓';
                        className = 'completed';
                    } else if (book.status === 'reading') {
                        icon = '▶';
                        className = 'reading';
                    }
                    const progressText = book.status === 'reading' ? ` (${book.progress_percent || 0}%)` : '';
                    return `<span class="path-book ${className}" onclick="showBookDetail(${book.book_id})" style="cursor:pointer;">${icon} ${escapeHtml(book.title)}${progressText}</span>`;
                }).join('')}
            </div>

            <div style="margin-top: 16px;">
                <button onclick="showAddBookToPathModal(${path.id})">+ Add Book</button>
            </div>
        </div>
    `;
}

function showCreatePathModal() {
    const content = `
        <form id="create-path-form" onsubmit="handleCreatePath(event)">
            <div class="form-group">
                <label for="path-name">Name</label>
                <input type="text" id="path-name" required placeholder="e.g., Leadership & Management">
            </div>
            <div class="form-group">
                <label for="path-description">Description (optional)</label>
                <textarea id="path-description" placeholder="What is this learning path about?"></textarea>
            </div>
            <div class="form-group">
                <label for="path-color">Color</label>
                <input type="color" id="path-color" value="#58a6ff">
            </div>
            <div class="form-actions">
                <button type="button" onclick="hideModal()">Cancel</button>
                <button type="submit" class="primary">Create Path</button>
            </div>
        </form>
    `;
    showModal('Create Learning Path', content);
}

async function handleCreatePath(e) {
    e.preventDefault();

    const name = document.getElementById('path-name').value;
    const description = document.getElementById('path-description').value;
    const color = document.getElementById('path-color').value;

    try {
        await api.createPath({ name, description, color });
        hideModal();
        await renderPaths(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error creating path:', error);
        alert('Failed to create path');
    }
}

async function showEditPathModal(pathId) {
    try {
        const path = await api.getPath(pathId);
        state.selectedPath = path;

        const content = `
            <form id="edit-path-form" onsubmit="handleEditPath(event, ${pathId})">
                <div class="form-group">
                    <label for="path-name">Name</label>
                    <input type="text" id="path-name" required value="${escapeHtml(path.name)}">
                </div>
                <div class="form-group">
                    <label for="path-description">Description</label>
                    <textarea id="path-description">${escapeHtml(path.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="path-color">Color</label>
                    <input type="color" id="path-color" value="${path.color || '#58a6ff'}">
                </div>
                <div class="form-actions">
                    <button type="button" onclick="hideModal()">Cancel</button>
                    <button type="submit" class="primary">Save Changes</button>
                </div>
            </form>
        `;
        showModal('Edit Learning Path', content);
    } catch (error) {
        console.error('Error loading path:', error);
    }
}

async function handleEditPath(e, pathId) {
    e.preventDefault();

    const name = document.getElementById('path-name').value;
    const description = document.getElementById('path-description').value;
    const color = document.getElementById('path-color').value;

    try {
        await api.updatePath(pathId, { name, description, color });
        hideModal();
        await renderPaths(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error updating path:', error);
        alert('Failed to update path');
    }
}

async function confirmDeletePath(pathId) {
    if (!confirm('Are you sure you want to delete this learning path? This will not delete the books, just the path.')) {
        return;
    }

    try {
        await api.deletePath(pathId);
        await renderPaths(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error deleting path:', error);
        alert('Failed to delete path');
    }
}

async function showAddBookToPathModal(pathId) {
    // Get list of books not in this path
    try {
        const [allBooks, pathBooks] = await Promise.all([
            api.getBooks({ perPage: 500 }),
            api.getPath(pathId)
        ]);

        const pathBookIds = new Set((pathBooks.books || []).map(b => b.user_book_id));
        const availableBooks = allBooks.books.filter(b => !pathBookIds.has(b.user_book_id));

        const content = `
            <div class="form-group">
                <label>Search for a book to add</label>
                <input type="text" id="book-search" placeholder="Type to search..." oninput="filterBookList()">
            </div>
            <div id="book-list" style="max-height: 300px; overflow-y: auto;">
                ${availableBooks.map(book => `
                    <div class="book-list-item" data-title="${escapeHtml(book.title.toLowerCase())}" data-author="${escapeHtml(book.author.toLowerCase())}" style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; gap: 12px; align-items: center;" onclick="addBookToPath(${pathId}, ${book.user_book_id})">
                        <div style="width: 40px; height: 60px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                            ${book.cover_image_url ? `<img src="${book.cover_image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(book.title)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(book.author)}</div>
                            <span class="status-badge status-${book.status}">${formatStatus(book.status)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        showModal('Add Book to Path', content);
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

function filterBookList() {
    const search = document.getElementById('book-search').value.toLowerCase();
    const items = document.querySelectorAll('.book-list-item');

    items.forEach(item => {
        const title = item.dataset.title;
        const author = item.dataset.author;
        const matches = title.includes(search) || author.includes(search);
        item.style.display = matches ? 'flex' : 'none';
    });
}

async function addBookToPath(pathId, userBookId) {
    try {
        await api.addBookToPath(pathId, userBookId);
        hideModal();
        await renderPaths(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error adding book to path:', error);
        if (error.message.includes('409')) {
            alert('This book is already in the path');
        } else {
            alert('Failed to add book to path');
        }
    }
}

async function removeBookFromPath(pathId, userBookId) {
    try {
        await api.removeBookFromPath(pathId, userBookId);
        await renderPaths(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error removing book from path:', error);
        alert('Failed to remove book from path');
    }
}
