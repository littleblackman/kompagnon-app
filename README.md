# Kompagnon - Project Management Application

A comprehensive project management application designed specifically for theatrical and cinematic projects. Built with Nuxt 3 and Symfony, it provides a hierarchical structure for organizing complex creative projects.

## 🎭 Features

### Project Hierarchy
- **Projects** → **Parts** → **Sequences** → **Scenes**
- Position-based ordering with drag-and-drop functionality
- Expand/collapse navigation for large projects
- Real-time synchronization with backend API

### Rich Content Management
- Integrated TinyMCE rich text editor for detailed descriptions
- Support for formatted text, links, and media
- Auto-save functionality

### User Management
- JWT-based authentication
- Secure token management with automatic refresh
- Role-based access control

### Modern UI/UX
- Responsive design optimized for all devices
- TailwindCSS styling with amber color scheme
- Modal-based editing system
- Intuitive navigation and project organization

## 🏗️ Architecture

### Frontend (Nuxt 3)
- **Framework**: Nuxt 3 with SSR disabled
- **State Management**: Pinia stores
- **Styling**: TailwindCSS + SCSS
- **Type Safety**: TypeScript
- **Icons**: HeroIcons

### Backend (Symfony API)
- **Framework**: Symfony 7.2 with PHP 8.2+
- **API**: RESTful API with API Platform 4.0
- **Database**: Doctrine ORM
- **Authentication**: JWT tokens via LexikJWTAuthenticationBundle
- **CORS**: NELMIO CORS Bundle for cross-origin support

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- PHP 8.2+
- Composer
- MySQL/PostgreSQL database

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kompagnon/app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   Create a `.env` file with:
   ```bash
   API_BASE=http://localhost:8000/api
   TINYMCE_API_KEY=your_tinymce_api_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Backend API Setup

1. **Navigate to the API directory**
   ```bash
   cd ../api  # or wherever your Symfony backend is located
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Database configuration**
   Configure your `.env` file with database credentials:
   ```bash
   DATABASE_URL="mysql://username:password@127.0.0.1:3306/kompagnon_db"
   ```

4. **Create database and run migrations**
   ```bash
   php bin/console doctrine:database:create
   php bin/console doctrine:migrations:migrate
   ```

5. **Generate JWT keys**
   ```bash
   php bin/console lexik:jwt:generate-keypair
   ```

6. **Start the Symfony server**
   ```bash
   symfony server:start --port=8000
   ```

   The API will be available at `http://localhost:8000`

## 📚 Usage

### Development Commands

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run generate     # Generate static site
```

**Backend:**
```bash
symfony server:start                    # Start development server
php bin/console doctrine:migrations:migrate  # Run database migrations
php bin/console cache:clear            # Clear application cache
```

### Project Structure

```
kompagnon/
├── app/                    # Nuxt 3 Frontend
│   ├── components/         # Vue components
│   │   └── Project/        # Project-specific components
│   ├── pages/             # Application pages
│   ├── store/             # Pinia stores
│   ├── middleware/        # Route middleware
│   ├── types/             # TypeScript definitions
│   └── assets/            # Static assets and styles
└── api/                   # Symfony Backend
    ├── src/
    │   ├── Entity/        # Doctrine entities
    │   ├── Service/       # Business logic services
    │   └── Controller/    # API controllers
    └── config/            # Symfony configuration
```

## 🔗 API Endpoints

### Authentication
- `POST /api/login_check` - User authentication

### Projects
- `GET /api/project/{slug}` - Fetch project with hierarchy
- `POST /api/project/update` - Create/update project
- `DELETE /api/project/delete/{id}` - Delete project

### Parts
- `PUT|POST /api/part/update` - Create/update part
- `DELETE /api/part/delete/{id}` - Delete part

### Sequences
- `POST /api/sequence/update` - Create/update sequence
- `DELETE /api/sequence/delete/{id}` - Delete sequence

### Scenes
- `POST /api/scene/update` - Create/update scene
- `DELETE /api/scene/delete/{id}` - Delete scene

## 🛠️ Key Features

### Hierarchical Data Management
The application maintains a strict hierarchy: Projects contain Parts, Parts contain Sequences, and Sequences contain Scenes. Each level supports:
- Position-based ordering
- CRUD operations with immediate API synchronization
- Expand/collapse states for navigation

### Position Management
Sophisticated position management allows for:
- Relative positioning using `afterPartId`, `afterSequenceId`, `afterSceneId`
- Automatic reordering when items are added, moved, or deleted
- Server-side position integrity maintenance

### State Synchronization
- Real-time sync between frontend state and backend API
- Optimistic updates with error handling
- Automatic conflict resolution

## 🔧 Configuration

### TinyMCE Setup
The rich text editor requires an API key from TinyMCE. Set the `TINYMCE_API_KEY` environment variable with your key.

### CORS Configuration
The backend is configured to accept requests from the frontend application. Modify CORS settings in the Symfony configuration if needed.

### Database
The application supports MySQL and PostgreSQL. Configure your database connection in the Symfony `.env` file.

## 📄 License

This project is proprietary. All rights reserved.

## 🤝 Contributing

Please contact the development team for contribution guidelines and access permissions.
