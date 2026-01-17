# Bariq - EV Charging Stations App

## Overview

Bariq is a React-based MVP web application for finding EV charging stations in Oman and the GCC region. It features an Arabic-first RTL interface with English language support. Users can browse charging stations on a map, view station details, report station status, start charging sessions, and add new stations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Maps**: Leaflet + React-Leaflet for interactive map display
- **Internationalization**: i18next with react-i18next for Arabic/English support with RTL layout switching
- **Build Tool**: Vite with React plugin

The frontend follows a pages-based structure under `client/src/pages/` with reusable components in `client/src/components/`. Custom hooks in `client/src/hooks/` handle data fetching and state management.

### Backend Architecture

- **Framework**: Express.js 5 running on Node.js
- **Language**: TypeScript with tsx for development runtime
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all database table definitions

The server handles API routes, serves static files in production, and uses Vite middleware in development for hot module replacement.

### Data Storage

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Management**: `drizzle-kit push` for database migrations
- **Tables**: 
  - `stations` - EV charging station data with bilingual names (Arabic/English)
  - `reports` - User-submitted station status reports
  - `evVehicles` - Catalog of EV models (reference data)
  - `userVehicles` - User's owned vehicles (links users to evVehicles)
  - `chargingSessions` - Charging session tracking with duration and energy metrics, linked to userVehicles
- **All tables have created_at and updated_at timestamps for analytics**

### Shared Code

The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database schema definitions and Zod insert schemas
- `routes.ts` - API route definitions with input/output type validation

### Path Aliases

- `@/*` maps to `client/src/*`
- `@shared/*` maps to `shared/*`
- `@assets/*` maps to `attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Mapping
- **Leaflet**: Open-source mapping library for displaying charging stations
- **OpenStreetMap**: Tile provider for map backgrounds

### UI Components
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible component primitives for dialogs, dropdowns, forms, etc.

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **Replit plugins**: Development banner and cartographer for Replit environment

## Recent Changes

### Custom Authentication System (January 2026)
- Replaced Replit Auth with custom in-app authentication
- **Email/Password**: Register and login with email/password (bcrypt hashing, 12 rounds)
- **Google OAuth**: Optional "Continue with Google" (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars)
- Session-based auth with express-session stored in PostgreSQL
- User table extended: passwordHash, provider (local/google), providerId, emailVerified
- Auth endpoints: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/user
- Frontend: /login page with login/register tabs, bilingual support (Arabic/English)
- Protected routes: charging sessions, adding stations/reports require login
- Auth files: server/auth/customAuth.ts, client/src/pages/AuthPage.tsx, client/src/hooks/use-auth.ts

### EV Vehicle Selection (January 2026)
- Added evVehicles table with 20 popular GCC cars including BYD (Atto 3, Seal, Dolphin, Han, Tang), Tesla, Nissan, BMW, Mercedes, Audi, Porsche, Hyundai, Kia, VW, MG
- Vehicle selection dropdown in charging session dialog with localStorage persistence
- Bilingual vehicle names (Arabic/English) based on app language
- Charging sessions linked to selected vehicle for improved tracking

### Charging Session Tracking (January 2026)
- Added comprehensive charging session tracking with duration, energy (kWh), and battery percentage monitoring
- New ChargingSessionDialog component for starting/ending sessions with energy input
- ChargingHistory page (/history) displays all past charging sessions with statistics
- API endpoints: POST /api/charging-sessions/start, POST /api/charging-sessions/:id/end, GET /api/charging-sessions
- Old /api/stations/:id/start-charging and /api/stations/:id/stop-charging endpoints deprecated (return 410 Gone)
- Allows multiple concurrent sessions per station based on available chargers
- Known MVP limitation: Some race conditions possible under high concurrency; rollback logic handles most failure cases

### Launch Readiness (January 2026)
- **Authentication required**: Adding stations and reports now requires user login (prevents spam)
- **Rate limiting**: API endpoints protected with express-rate-limit:
  - General: 100 requests per 15 minutes
  - Station creation: 10 per hour
  - Reports: 20 per hour
- **SEO**: All pages have meta tags (title, description, Open Graph, Twitter)
- **Pagination**: Station list shows 12 items with "Show More" button
- **RTL/Arabic**: Full support with document direction switching
- **Database storage**: PostgreSQL on Neon (serverless), data persists across deployments