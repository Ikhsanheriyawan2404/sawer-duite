# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ongob is a payment notification system consisting of three components:
- **Android app** (`android/`): Kotlin app that listens to DANA payment notifications and forwards them to the backend
- **Backend** (`backend/`): Go REST API with Chi router, GORM/PostgreSQL, and JWT authentication
- **Web UI** (`ui/`): React + TypeScript frontend with Vite

## Development Commands

### Backend (Go)
```bash
cd backend
go run cmd/api/main.go        # Run API server (port 3000)
go test ./...                 # Run all tests
go test ./internal/service    # Run tests for specific package
```

### Web UI (React/Vite)
```bash
cd ui
bun install                   # Install dependencies
bun run dev                   # Development server
bun run build                 # Build for production
bun run lint                  # ESLint
```

### Android
```bash
cd android
./gradlew build               # Build APK
./gradlew assembleDebug       # Debug APK
```

## Architecture

### Backend Structure (Clean Architecture)
```
backend/
├── cmd/api/main.go           # Entry point, router setup
└── internal/
    ├── domain/               # Data models and config
    ├── handler/              # HTTP handlers
    ├── middleware/           # Auth, CORS middleware
    ├── repository/           # Database layer (GORM)
    └── service/              # Business logic (JWT)
```

**Request flow**: Router → Middleware → Handler → Service → Repository

### Web UI Structure
```
ui/src/
├── App.tsx                   # Routes and layout
├── pages/                    # Route components
├── components/               # Reusable components (ProtectedRoute)
└── lib/api.ts                # API client with auth helpers
```

### Android Components
- `NotificationListener`: Listens for DANA app notifications, filters payment notifications, prevents duplicates via cache
- `Parser`: Extracts amount (Rp format) and bank name from notification text
- `NetworkClient`: Sends parsed payment data to backend with retry logic

## Key Patterns

- Backend uses dependency injection: handlers receive db and services via constructors
- Authentication: JWT access/refresh tokens, middleware extracts `user_id` to context
- UI stores tokens in localStorage, auto-clears on 401 response
- Android uses `NotificationListenerService` with 10-second duplicate cache

## Database

PostgreSQL with GORM auto-migration. Default connection on port 5433 (configured in `domain/config.go`).

## Code Style

- Indent: 2 spaces (all files except Makefile)
- Go: space indentation (non-standard, per .editorconfig)
