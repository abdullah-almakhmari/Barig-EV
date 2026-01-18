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

### Community Verification (January 2026)
- **Purpose**: Users can confirm station status (WORKING, NOT_WORKING, BUSY) to help the community
- **Database**: stationVerifications table with stationId, userId, vote, createdAt
- **Anti-spam**: One verification per user per station per 30 minutes (updates existing vote)
- **Verification Summary**:
  - Counts votes in last 30 minutes
  - "Verified" if >= 2 votes for leading status
  - "Strongly Verified" if >= 3 votes
  - Shows leading status badge (Working/Not Working/Busy)
  - Includes lastVerifiedAt timestamp for time context
- **API Endpoints**:
  - POST /api/stations/:id/verify - Submit verification (requires auth)
  - GET /api/stations/:id/verification-summary - Get summary with lastVerifiedAt (public)
- **Frontend UX**:
  - Prominent verification badge near station title (immediately visible)
  - Shows "Verified by community (X users)" when verified as Working
  - Shows "Under review - not recently verified" when no recent votes
  - Time context: "Last confirmed X min ago" below the verification summary
  - Micro-copy: "Help other drivers by confirming the current charger status."
  - Three colored buttons: Confirm Working (green), Confirm Not Working (red), Confirm Busy (orange)
- **Bilingual Support**: Full Arabic/English translations

### Admin Panel (January 2026)
- **User Roles**: Added role field to users (user/owner/admin)
- **Admin Access**: Only users with role="admin" can access /admin route
- **Frontend Protection**: AdminPanel redirects non-admin users to home
- **Backend Protection**: All /api/admin/* endpoints check isAuthenticated + isAdmin middleware, return 403 for non-admins
- **Reports Management**:
  - View all reports with station name, reason, reporter email, created date
  - Admin actions: Mark as resolved, rejected, or confirmed (keeps station under review)
  - Review status tracked with reviewedBy and reviewedAt timestamps
- **Stations Management**:
  - View all stations including hidden ones
  - Hide/Archive stations (isHidden field) - hidden stations don't appear on map for normal users
  - Restore hidden stations
- **Admin Endpoints**:
  - GET /api/admin/reports - All reports with details
  - PATCH /api/admin/reports/:id/review - Update review status
  - GET /api/admin/stations - All stations including hidden
  - PATCH /api/admin/stations/:id/visibility - Hide/restore station
- **Creating Admin User**: Update user role directly in database: UPDATE users SET role = 'admin' WHERE email = 'your@email.com'
- **Bilingual Support**: Full Arabic/English translations for admin panel

### Anti-Tampering System (January 2026)
- **Authorization**: Only station owner OR user with active charging session can change charger status/availability
- **Trust Level**: Stations have trustLevel field (NORMAL/LOW) - LOW shows "Under Review" badge
- **Report Threshold**: Stations with 3+ user reports automatically get trustLevel=LOW
- **Protected Endpoints**: PATCH /api/stations/:id/availability requires auth + ownership/session check
- **Owner-Only Status**: PATCH /api/stations/:id/status for owner to change OPERATIONAL/MAINTENANCE/OFFLINE
- **Normal Users**: Can only submit reports (not directly change station status)
- **Validation**: Status updates use Zod validation with enum for allowed values
- **Error Messages**: Clear 403 errors explaining users can report instead of change status

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

### User Trust & Loyalty System (January 2026)
- **Purpose**: Professional trust system to improve data reliability and reduce abuse - NOT gamification
- **Database Fields** (users table):
  - `trustScore` (INT, default 0) - Internal score, never shown to users
  - `userTrustLevel` (VARCHAR: NEW/NORMAL/TRUSTED, default NEW) - Determines badge visibility
- **Trust Levels**:
  - NEW: trustScore < 5 (default for new users)
  - NORMAL: trustScore 5-9 (reliable users)
  - TRUSTED: trustScore ≥ 10 (highly reliable users, shows badge)
- **Score Increases**:
  - +1: User's verification matches community leading status (≥3 confirmations in 30 min)
  - +2: User's report reason confirmed by ≥2 others within 24 hours
- **Score Decreases**:
  - -1: User contradicts community consensus ≥3 times within 24 hours
- **Trust Logic File**: `server/trust/trustSystem.ts`
- **Frontend UX**:
  - NO visible scores, points, leaderboards, or gamification
  - Only TRUSTED users see subtle badge: "Trusted User" / "مستخدم موثوق"
  - Badge appears in verification section on StationDetails page
  - Component: `client/src/components/TrustedUserBadge.tsx`
- **API Endpoint**:
  - GET /api/users/:id/trust-level - Returns user's trust level for badge display
- **Idempotency**: Database-backed `trust_events` table ensures rewards/penalties are truly one-per-window even after server restarts
  - Table tracks: userId, eventType, stationId, reason, delta, createdAt
  - Row-level locking (SELECT FOR UPDATE on user) serializes concurrent requests per user
  - Sliding window query (createdAt >= now - windowMs) checks for existing events within transaction
  - All trust updates use database transactions for consistency
  - Index on (user_id, event_type, station_id, reason, created_at) for efficient lookups
- **Trust Logic File**: `server/trust/trustSystem.ts`
- **Bilingual Support**: Full Arabic/English translations for badge