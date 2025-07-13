# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 3 application for project management, specifically designed for theatrical/cinematic project organization. The application uses a hierarchical structure: Projects → Parts → Sequences → Scenes.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

## Architecture

### Core Technologies
- **Nuxt 3** with SSR disabled (`ssr: false`)
- **Vue 3** with Composition API
- **Pinia** for state management
- **TailwindCSS** for styling
- **TypeScript** for type safety
- **TinyMCE** for rich text editing

### State Management
The application uses Pinia stores located in `/store/`:
- `auth.ts` - Authentication and user management
- `project.ts` - Main project data and hierarchical structure management
- `metadata.ts` - Application metadata

### API Configuration
- API base URL: `http://localhost:8000/api` (configurable via `API_BASE` env var)
- API proxy configured in `nuxt.config.ts` for `/api/**` routes
- Authentication uses JWT tokens stored in localStorage

### Component Architecture
Components are organized by feature in `/components/`:
- `Project/` - All project-related components (ActionButtons, PartList, SequenceModal, etc.)
- Modal components for creating/editing Parts, Sequences, and Scenes
- RichTextEditor component wrapping TinyMCE

### Data Hierarchy
The core data structure follows this hierarchy:
```
Project
├── Parts (with position ordering)
│   └── Sequences (with position ordering)
│       └── Scenes (with position ordering)
```

Each level maintains:
- CRUD operations via API
- Position-based ordering
- Expand/collapse state management
- Local state synchronization with server responses

### Authentication
- Token-based authentication with automatic localStorage persistence
- Auth middleware (`middleware/auth.ts`) protects routes
- Automatic token validation and refresh on route navigation
- Logout clears token and redirects to login

### Key Store Methods
In `useProjectStore()`:
- `fetchProject(slug)` - Loads complete project hierarchy
- `addPart/updatePart/deletePart` - Part management with position reordering
- `saveSequence/deleteSequence` - Sequence management within parts
- `saveScene/deleteScene` - Scene management within sequences
- Expand/collapse functionality for hierarchical navigation

### Modal System
Modal components are conditionally rendered based on `modalType` state:
- PartModal, SequenceModal, SceneModal
- Centralized modal management in ActionButtons component
- Event-driven save/close operations

### Styling Approach
- TailwindCSS with custom SCSS in `/assets/scss/`
- Component-scoped styling when needed
- Responsive design with mobile-first approach
- Amber color scheme for primary actions

## Backend API (Symfony)

### Technology Stack
- **Symfony 7.2** with PHP 8.2+
- **API Platform 4.0** for REST API generation
- **Doctrine ORM** for database management
- **LexikJWTAuthenticationBundle** for JWT authentication
- **NELMIO CORS Bundle** for cross-origin requests

### API Endpoints
Main endpoints following RESTful conventions:
- `GET /api/project/{slug}` - Fetch project with complete hierarchy
- `POST /api/project/update` - Create/update projects
- `DELETE /api/project/delete/{id}` - Delete projects
- `PUT|POST /api/part/update` - Create/update parts with position management
- `DELETE /api/part/delete/{id}` - Delete parts
- `POST /api/sequence/update` - Create/update sequences with position management
- `DELETE /api/sequence/delete/{id}` - Delete sequences
- `POST /api/scene/update` - Create/update scenes with position management
- `DELETE /api/scene/delete/{id}` - Delete scenes
- `POST /api/login_check` - JWT authentication endpoint

### Data Model
**Entities with their relationships:**
- `Project` (has many Parts, belongs to User and Type)
- `Part` (belongs to Project, has many Sequences, has Status)
- `Sequence` (belongs to Part, has many Scenes, has Status)
- `Scene` (belongs to Sequence, has Status)
- `User` (authentication entity)
- `Status`, `Type`, `Criteria` (lookup entities)

### Business Logic (Services)
**Position Management**: All hierarchical entities (Parts, Sequences, Scenes) maintain ordered positions with sophisticated logic:
- Supports relative positioning using `afterPartId`, `afterSequenceId`, `afterSceneId`
- Automatic position reordering when items are inserted or deleted
- Position shifts are handled server-side to maintain integrity

**Key Service Methods:**
- `PartService::createOrUpdate()` - Handles part CRUD with position reordering
- `SequenceService::createOrUpdate()` - Manages sequence positioning within parts  
- `SceneService::createOrUpdate()` - Handles scene positioning within sequences
- All services include automatic status assignment for new entities (default status ID: 6)

### Authentication
- JWT token-based authentication
- Login endpoint: `POST /api/login_check`
- Tokens include user information and permissions
- Frontend stores tokens in localStorage for persistence

## Important Notes
- The application requires a backend API running on port 8000
- TinyMCE requires an API key (configured via environment variable)
- All CRUD operations immediately sync with the backend API
- Position management is handled server-side and synced to local state
- API uses serialization groups for controlling data exposure (`project:read`, `part:read`, etc.)
- Cascade deletion: removing a Project deletes all Parts, Sequences, and Scenes