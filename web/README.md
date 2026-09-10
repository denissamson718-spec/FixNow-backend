# FixNow Web Admin Dashboard

A modern React web application for FixNow admin management, built with Vite, TypeScript, and React Router.

## Features

- Modern, responsive dashboard UI
- User authentication with JWT tokens
- Overview statistics
- Pending mechanic approval management
- Driver registration tracking
- Real-time data from backend API

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd web
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will start at `http://localhost:3000` with the backend API proxied from `http://localhost:4010`.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## How It Works

1. **Backend Server**: Runs on `http://localhost:4010`
2. **Web App**: Runs on `http://localhost:3000`
3. **API Proxy**: Development environment proxies `/api/*` requests to backend

## Running Both Services

From the root directory:

```bash
npm run dev
```

This runs both the backend server and the web app concurrently.

Or separately:

**Terminal 1 (Backend):**
```bash
npm run backend
```

**Terminal 2 (Web App):**
```bash
npm run web
```

## Authentication

- Login with your admin credentials
- Token stored in localStorage
- Token passed in Authorization header for API requests

## Directory Structure

```
web/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx       // Login page with form
│   │   ├── LoginPage.css
│   │   ├── DashboardPage.tsx   // Main dashboard
│   │   └── DashboardPage.css
│   ├── App.tsx                 // Main app with routing
│   ├── App.css
│   ├── main.tsx               // React entry point
│   └── index.css              // Global styles
├── index.html                 // HTML entry point
├── vite.config.ts             // Vite configuration
├── tsconfig.json              // TypeScript configuration
└── package.json
```

## API Endpoints Used

- `POST /api/auth/login` - User login
- `GET /api/admin/overview` - Dashboard overview stats
- `POST /api/admin/mechanics/:id/approve` - Approve mechanic

## Environment Variables

Create a `.env` file if needed (optional for development):

```
VITE_API_URL=http://localhost:4010
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
