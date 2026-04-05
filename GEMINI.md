# Sawer Duite Project Context

Sawer Duite is a comprehensive payment notification system designed to capture, process, and display real-time payment alerts (specifically from DANA and GoPay) for streamers or merchants.

## Project Structure

- **`android/`**: Kotlin-based Android application that acts as a notification listener.
- **`backend/`**: Go REST API that processes payment data, manages users, and handles TTS (Text-to-Speech) generation.
- **`ui/`**: React + TypeScript frontend for displaying alerts and managing the system.

---

## 🏗 Backend (Go)

- **Framework**: [Chi Router](https://github.com/go-chi/chi)
- **Database**: PostgreSQL with [GORM](https://gorm.io/)
- **Cache/Rate Limiting**: Redis
- **Auth**: JWT (Access & Refresh tokens)
- **Storage**: MinIO (for TTS and media assets)
- **Architecture**: Clean Architecture (Domain, Handler, Middleware, Repository, Service)

### Key Commands
```bash
cd backend
go run cmd/api/main.go        # Run API server (port 3000)
go test ./...                 # Run all tests
```

### Environment Variables (See `.env.example`)
- `DB_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secrets for token signing.
- `MINIO_*`: Configuration for object storage.

---

## 💻 Web UI (React)

- **Framework**: React 19 + TypeScript + Vite
- **Routing**: React Router 7
- **Styling**: Vanilla CSS (per project preference)
- **Icons**: SVG-based system

### Key Commands
```bash
cd ui
bun install                   # Install dependencies
bun run dev                   # Start development server
bun run build                 # Build for production
```

---

## 📱 Android App (Kotlin)

- **Core Logic**: `NotificationListenerService` captures notifications from the DANA app.
- **Parsing**: `Parser.kt` extracts transaction amounts and bank names using regex.
- **Persistence**: `SettingsManager` for local configuration.
- **Background Tasks**: WorkManager for log uploads and watchdog services.

### Key Commands
```bash
cd android
./gradlew assembleDebug       # Build debug APK
./gradlew assembleRelease     # Build release APK
```

---

## 🚀 Deployment & Infrastructure

- **Docker**: `compose.yml` for production-like environment with Traefik integration.
- **CI/CD**: GitHub Actions for:
    - Android builds and signing (`.github/workflows/android-build.yml`).
    - Backend/Frontend deployment (`.github/workflows/deploy.yml`).
- **Permissions**: The Android build requires `contents: write` permission in GitHub Actions to create releases.

---

## 🛠 Development Conventions

- **Language Standards**: 
    - Go: 2-space indentation (via `.editorconfig`).
    - Web: TypeScript for type safety, React 19 primitives.
    - Android: Kotlin with Coroutines and WorkManager.
- **Database**: GORM Auto-migration is used.
- **Authentication**: JWT tokens are extracted from headers via middleware. 
- **Security**: Sensitive keys must be stored in `.env` and never committed.
