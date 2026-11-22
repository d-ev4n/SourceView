# SourceView

### Visual Research & Knowledge Management Platform

SourceView is a full-stack web application designed to help users collect, organize, and connect research sources through an interactive knowledge graph.

It transforms traditional link-based research organization into a visual workspace where users can explore relationships between articles, websites, research papers, and notes.

## Key Features

**Authentication & User Management**
- User registration and login
- JWT-based authentication
- Secure password hashing
- Private user workspaces
- Duplicate username and email validation

**Research Source Management**
- Add, edit, and delete research sources
- Support for articles, websites, research papers, and notes
- Store titles, URLs, and descriptions
- Search and filter research sources

**Interactive Knowledge Graph**
- Visualize sources as connected nodes
- Independently draggable nodes
- Save graph node positions
- Lock and unlock graph nodes
- Reset graph layout
- Fit graph to view
- Display multiple relationships between sources

**Relationship Management**

| Relationship | Meaning |
|---|---|
| Related | Sources discuss connected topics |
| Supports | One source provides evidence supporting another |
| Contradicts | Sources present conflicting information |
| Expands | One source provides additional information |

**User Interface**
- Light and dark themes
- Interactive graph controls
- Relationship help guide
- Responsive interface

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, HTML, CSS |
| Build Tool | Vite |
| Graph Visualization | React Flow |
| Backend | Python, FastAPI |
| Database Access | SQLAlchemy |
| Authentication | JWT |
| API Architecture | REST API |

## How SourceView Works

1. Create an account and log in.
2. Add research sources to your workspace.
3. Connect sources using meaningful relationship types.
4. Explore the connections through the interactive knowledge graph.
5. Search, filter, edit, and organize your research.

## Project Structure

```text
sourceview/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── create_tables.py
│   └── migrate_private_workspaces.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── AuthPage.jsx
│   │   ├── AuthPage.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Security

- Password hashing
- JWT authentication
- Private user workspaces
- Input validation
- Database constraints
- Environment variables for sensitive configuration

Sensitive files such as `.env` and local credentials are excluded from version control.

## Future Improvements

- Automatic webpage metadata extraction
- PDF importing and annotation
- Exportable knowledge graphs
- Advanced search
- AI-assisted research organization
- Collaborative workspaces

## Project Purpose

SourceView is an independent portfolio project developed to demonstrate practical skills in full-stack development, REST API design, authentication, relational databases, and interactive graph visualization.

## Author

**Devadarsan S**


