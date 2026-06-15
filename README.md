# SDN Project

This repository contains the Software Defined Networking (SDN) project codebase. It is organized as a lightweight monorepo comprising an Express backend and a React frontend.

---

## Project Architecture & Stack

The application is structured into two main packages orchestrating together:

1. **Frontend (`ui/`)**: A Single Page Application (SPA) built with React 19 and Create React App (CRA).
   - **Framework**: React 19.2.7
   - **Routing**: `react-router-dom` v6
   - **HTTP Client**: `axios`
2. **Backend (`server/`)**: A Node.js REST API built with Express.
   - **Framework**: Express 5.2.1
   - **Security & Utilities**: `helmet`, `cors`, `morgan`, `dotenv`
   - **Dev Tools**: `nodemon` (hot reloading)

---

## Directory Structure

```text
sdn-project/                         # Monorepo Workspace Root
├── package.json                     # Orchestrates workspace dependencies and scripts
├── server/                          # Express API Server
│   ├── .env.example                 # Example configuration for environment variables
│   ├── package.json                 # Server dependencies and scripts
│   └── src/                         # Source files for backend
│       ├── server.js                # App entry point & database connection initiator
│       ├── app.js                   # Express application setup and middleware configuration
│       ├── config/                  # Configuration details (db, environment)
│       │   ├── db.js                # Database connection helper (stub)
│       │   └── environment.js       # Reads and validates environment variables
│       └── modules/                 # Modular feature-based structure
│           └── auth/                # Authentication & User module
│               ├── controllers/     # Route controller logic
│               ├── middleware/      # Module-specific middleware (auth, errorHandler)
│               ├── models/          # Data models
│               └── routes/          # Module route definitions
└── ui/                              # React Single Page Application (Frontend)
    ├── package.json                 # UI dependencies and scripts
    ├── public/                      # Static client-side assets
    └── src/                         # React source code
        ├── index.js                 # Frontend application entry point
        ├── App.js                   # Root component containing routing and providers
        ├── App.css                  # Global styles
        ├── components/              # Reusable presentation components
        ├── context/                 # React state contexts (AuthContext)
        ├── hooks/                   # Custom React hooks (useAuth)
        ├── pages/                   # Top-level page/view components (Login, Dashboard)
        └── services/                # API communication clients (apiClient)
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18+ recommended)
- `npm` (packaged with Node.js)

### Installation
From the root of the project, install all workspace and sub-project dependencies concurrently:
```bash
npm run install:all
```

### Environment Configuration
The server expects a `.env` file containing environment variable overrides. Create it by copying the template file:
```bash
cp server/.env.example server/.env
```

Review the values in `server/.env` and update them as necessary. Default variables include:
- `PORT`: Port on which the API server runs (default: `5000`)
- `NODE_ENV`: Application environment (`development` or `production`)
- `CLIENT_URL`: Origin of the React UI allowed by CORS (default: `http://localhost:3000`)
- `DATABASE_URL`: MongoDB connection URL (default: `mongodb://localhost:27017/sdn_db`)
- `JWT_SECRET`: Secret key used for signing JWT tokens

---

## Available Scripts

Run these commands from the root directory:

*   **`npm run install:all`**: Installs root dependencies, server dependencies, and client-side dependencies.
*   **`npm run dev`**: Starts both the Express backend and the React frontend concurrently in development mode.
*   **`npm run server`**: Starts only the Express server in development mode (restarts on file changes using `nodemon`).
*   **`npm run ui`**: Starts only the React frontend development server (webpack-dev-server running on http://localhost:3000).

---

## Key Workflows & Current Implementation Status

The project is currently in the scaffolding and stub phase. The following is the status of the core modules:

### 1. Authentication & Security (Frontend/Backend)
*   **Frontend Auth State**: Managed using a global React context in `ui/src/context/AuthContext.js`.
*   **Backend Auth State**: The token check middleware at `server/src/modules/auth/middleware/auth.js` is a placeholder that bypasses validation and returns a stub user object (`{ id: '123', name: 'John Doe', email: 'john@example.com', role: 'admin' }`).
*   **Login Flow**: The login client-side submission triggers a mock delay and signs in the mock user directly without hitting a database.

### 2. Database Integration
*   The connection handler in `server/src/config/db.js` is a mock function that prints connection messages but does not connect to an actual database instance.

---

## Known Setup/Startup Issues

There is a known path resolution error on the server which currently prevents `npm run dev` or `npm run server` from running successfully without local code updates:

*   **Root `app.js` Path Imports**:
    In `server/src/app.js`, imports for the main routes and global error handler are currently hardcoded to paths that do not exist:
    ```javascript
    const routes = require('./routes'); // FAILS: File does not exist at 'server/src/routes'
    const errorHandler = require('./middleware/errorHandler'); // FAILS: File does not exist at 'server/src/middleware/errorHandler'
    ```
    These need to be updated to import from the modular authentication paths:
    - `routes` -> `./modules/auth/routes`
    - `errorHandler` -> `./modules/auth/middleware/errorHandler`
