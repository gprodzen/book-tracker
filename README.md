# Book Tracker

A personal reading management application with a Kanban-style pipeline view for tracking books through your reading workflow.

## Features

- **Pipeline View**: Kanban board to move books through stages (Interested → Owned → Queued → Reading → Finished)
- **Dashboard**: Overview of currently reading books, learning paths, and queued items
- **Learning Paths**: Organize books into themed learning paths with progress tracking
- **Library**: Full library view with search and filtering
- **WIP Limits**: Configurable work-in-progress limits to focus your reading
- **Offline Support**: Works offline with automatic sync when back online

## Quick Start

### Development

```bash
# Clone the repository
git clone <repo-url>
cd book-tracker

# Start the development server
./dev.sh

# Open in browser
open http://localhost:5001
```

The `dev.sh` script will:
1. Create a Python virtual environment (if needed)
2. Install dependencies
3. Initialize the database
4. Start the Flask development server with hot reload

### Docker

```bash
# Build and run with Docker
docker build -t book-tracker .
docker run -p 8080:8080 book-tracker

# Open in browser
open http://localhost:8080
```

## Project Structure

```
book-tracker/
├── backend/                 # Flask API server
│   ├── app.py              # Main application entry
│   ├── models.py           # SQLAlchemy models
│   ├── routes/             # API route handlers
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # Web Components frontend
│   ├── index.html          # Entry point
│   ├── styles/             # CSS stylesheets
│   │   ├── tokens.css      # Design system tokens
│   │   ├── animations.css  # Animation keyframes
│   │   ├── base.css        # Base styles & resets
│   │   └── components.css  # Component styles
│   └── src/
│       ├── app.js          # Application bootstrap
│       ├── core/           # Framework utilities
│       │   ├── base-component.js
│       │   ├── store.js
│       │   ├── router.js
│       │   └── events.js
│       ├── components/     # Reusable components
│       │   ├── layout/     # App shell, navigation
│       │   └── shared/     # Book cards, modals, etc.
│       ├── views/          # Page-level components
│       └── services/       # API client
│
├── Dockerfile              # Production container
├── dev.sh                  # Development server script
└── README.md
```

## Tech Stack

- **Backend**: Flask + SQLite + SQLAlchemy
- **Frontend**: Vanilla JS Web Components (no framework)
- **Styling**: Custom CSS with design tokens
- **Deployment**: Docker → Railway (or any container platform)

## Design System

The UI uses a refined dark theme with warm amber accent (#F5A623) for a distinctive "library" feel.

### Fonts
- **Display**: Inter (headings, UI text)
- **Mono**: IBM Plex Mono (numbers, code)

### Colors
- Background: Deep blue-gray tones (#0a0e14, #12171f, #1a2028)
- Text: Light grays (#e6edf5, #a3b3c7, #6b7d93)
- Accent: Warm amber (#F5A623)
- Status colors for book stages (purple, blue, green, amber, emerald)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard data |
| GET | `/api/pipeline` | Pipeline/kanban data |
| GET | `/api/books` | List all books |
| POST | `/api/books` | Add a new book |
| PUT | `/api/books/<id>` | Update a book |
| DELETE | `/api/books/<id>` | Delete a book |
| GET | `/api/paths` | List learning paths |
| POST | `/api/paths` | Create a path |

## Development

### Prerequisites
- Python 3.8+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest

# Frontend (no build step required)
# Just open frontend/index.html in a browser
```

### Code Style

- Python: Follow PEP 8
- JavaScript: ES6+ modules, Web Components
- CSS: BEM-ish naming, design tokens for all values

## Deployment

The app is configured for deployment on Railway:

1. Connect your GitHub repository to Railway
2. Railway will auto-detect the Dockerfile
3. Set any environment variables if needed
4. Deploy!

## License

MIT
