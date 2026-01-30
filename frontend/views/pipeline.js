/**
 * Pipeline View
 * Kanban-style board for managing books through reading stages
 */

async function renderPipeline(container) {
    container.innerHTML = '<div class="loading">Loading pipeline...</div>';

    try {
        const data = await api.getPipeline();
        state.pipeline = data;

        const { pipeline, wip_limit } = data;
        const readingCount = pipeline.reading ? pipeline.reading.length : 0;

        const columns = [
            { key: 'interested', title: 'Interested', subtitle: 'wishlist' },
            { key: 'owned', title: 'Owned', subtitle: 'purchased' },
            { key: 'queued', title: 'Queued', subtitle: 'up next' },
            { key: 'reading', title: 'Reading', subtitle: `${readingCount}/${wip_limit}`, isWip: true },
            { key: 'finished', title: 'Finished', subtitle: '' },
        ];

        container.innerHTML = `
            <div class="pipeline">
                ${columns.map(col => renderPipelineColumn(col, pipeline[col.key] || [], wip_limit)).join('')}
            </div>
        `;

        setupDragAndDrop();

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Failed to load pipeline</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">Make sure the backend is running on port 5001</p>
            </div>
        `;
        console.error('Pipeline error:', error);
    }
}

function renderPipelineColumn(col, books, wipLimit) {
    const count = books.length;
    let countClass = '';

    if (col.isWip) {
        if (count >= wipLimit) countClass = 'warning';
    }

    return `
        <div class="pipeline-column" data-status="${col.key}">
            <div class="column-header">
                <div>
                    <span class="column-title">${col.title}</span>
                    ${col.subtitle ? `<span style="font-size: 0.65rem; color: var(--text-muted); display: block;">${col.subtitle}</span>` : ''}
                </div>
                <span class="column-count ${countClass}">${count}</span>
            </div>
            <div class="column-books" data-status="${col.key}">
                ${books.map(book => renderPipelineCard(book)).join('')}
            </div>
        </div>
    `;
}

function renderPipelineCard(book) {
    const progress = book.progress_percent || 0;
    const isStale = book.is_stale === 1;

    const pathTags = book.paths && book.paths.length > 0
        ? book.paths.map(p => `<span class="path-tag" style="border-left: 2px solid ${p.color}">${escapeHtml(p.name)}</span>`).join('')
        : '';

    return `
        <div class="pipeline-card"
             draggable="true"
             data-book-id="${book.book_id}"
             data-user-book-id="${book.user_book_id}"
             data-status="${book.status}">
            <div class="pipeline-card-cover">
                ${book.cover_image_url
                    ? `<img src="${book.cover_image_url}" alt="${escapeHtml(book.title)}">`
                    : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--text-muted);padding:4px;">${escapeHtml(book.title)}</div>`
                }
            </div>
            <div class="pipeline-card-title">${escapeHtml(book.title)}</div>
            <div class="pipeline-card-author">${escapeHtml(book.author)}</div>
            <div class="pipeline-card-meta">
                ${book.status === 'reading' ? `
                    <span class="pipeline-card-progress">${progress}%</span>
                ` : ''}
                ${isStale ? '<span class="stale-indicator">30+ days</span>' : ''}
                ${book.status === 'finished' && book.my_rating ? `
                    <span class="book-rating">${'★'.repeat(book.my_rating)}</span>
                ` : ''}
                ${pathTags}
            </div>
        </div>
    `;
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.pipeline-card');
    const columns = document.querySelectorAll('.column-books');

    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.dragging')) {
                showBookDetail(card.dataset.bookId);
            }
        });
    });

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

let draggedCard = null;

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.bookId);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.pipeline-card').forEach(card => {
        card.classList.remove('drag-over');
    });
    document.querySelectorAll('.column-books').forEach(col => {
        col.classList.remove('drag-over');
    });
    draggedCard = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    // Only remove if we're leaving the column, not entering a child
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (!draggedCard) return;

    const newStatus = this.dataset.status;
    const oldStatus = draggedCard.dataset.status;
    const bookId = draggedCard.dataset.bookId;

    if (newStatus === oldStatus) return;

    // Check WIP limit for reading column
    if (newStatus === 'reading') {
        const wipLimit = state.pipeline?.wip_limit || 5;
        const currentReading = state.pipeline?.pipeline?.reading?.length || 0;
        if (currentReading >= wipLimit) {
            alert(`You've reached your WIP limit of ${wipLimit} books. Finish or pause a book before starting a new one.`);
            return;
        }
    }

    try {
        await api.updateBook(bookId, { status: newStatus });
        // Refresh the pipeline view
        await renderPipeline(document.getElementById('view-container'));
    } catch (error) {
        console.error('Error updating book status:', error);
        alert('Failed to update book status');
    }
}
