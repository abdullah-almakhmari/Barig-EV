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
  - `chargingSessions` - Charging session tracking with duration and energy metrics

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

### Charging Session Tracking (January 2026)
- Added comprehensive charging session tracking with duration, energy (kWh), and battery percentage monitoring
- New ChargingSessionDialog component for starting/ending sessions with energy input
- ChargingHistory page (/history) displays all past charging sessions with statistics
- API endpoints: POST /api/charging-sessions/start, POST /api/charging-sessions/:id/end, GET /api/charging-sessions
- Old /api/stations/:id/start-charging and /api/stations/:id/stop-charging endpoints deprecated (return 410 Gone)
- Allows multiple concurrent sessions per station based on available chargers
- Known MVP limitation: Some race conditions possible under high concurrency; rollback logic handles most failure cases