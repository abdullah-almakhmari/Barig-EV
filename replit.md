# Bariq - EV Charging Stations App

## Overview

Bariq is a React-based MVP web application designed to help users find EV charging stations in Oman and the GCC region. It provides an Arabic-first, RTL interface with English language support. Users can browse charging stations on an interactive map, view detailed information, report station statuses, initiate charging sessions, and contribute by adding new stations. The project aims to improve data reliability through community verification and a professional trust system, ensuring users can quickly determine a station's status. It also includes an admin panel for content moderation and quality control, addressing the business vision of providing a reliable and user-friendly EV charging station locator in the region.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with shadcn/ui
- **Maps**: Leaflet + React-Leaflet for interactive map display using OpenStreetMap tiles
- **Internationalization**: i18next with react-i18next for Arabic/English (RTL/LTR switching)
- **Build Tool**: Vite
- **Structure**: Pages-based (`client/src/pages/`), reusable components (`client/src/components/`), custom hooks (`client/src/hooks/`).
- **UI/UX**: Features a "5-Second Decision UX" with prominent station status banners, time context for verification, and recommendation labels. Map markers are enhanced to visually represent station priority (availability, status). Station details are collapsible.

### Backend

- **Framework**: Express.js 5 on Node.js
- **Language**: TypeScript with tsx
- **API Design**: RESTful endpoints with Zod schemas for validation, defined in `shared/routes.ts`.
- **Authentication**: Custom session-based authentication supporting email/password and Google OAuth. Sessions are stored in PostgreSQL. User roles (user/owner/admin) are implemented for access control.
- **Admin Panel**: Provides functionality for managing user-submitted reports and stations (approval, hiding/restoring). Access is restricted to admin users.
- **Anti-Tampering & Trust System**: Implements authorization checks for station status changes (owner/active session only). A professional trust system tracks user reliability without gamification, influencing an internal `trustScore` and `userTrustLevel` (NEW/NORMAL/TRUSTED) to identify trusted contributors. This system includes logic for increasing/decreasing scores based on verification accuracy and report validation, ensuring idempotency with `trust_events` table.
- **Station Approval Workflow**: All user-submitted stations require manual admin approval before becoming visible on the public map.
- **Rate Limiting**: API endpoints are protected with `express-rate-limit` (auth: 10/15min, register: 5/hr, verifications: 30/15min).
- **Security Hardening**:
  - **CSRF Protection**: Double-submit cookie pattern via `x-csrf-token` header. Frontend auto-fetches token from `/api/csrf-token`.
  - **Helmet**: Security headers (CSP, X-Frame-Options, etc.) configured for production.
  - **Production Error Handling**: Sanitized error responses in production mode.

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle ORM for type-safe queries and `drizzle-kit` for migrations.
- **Key Tables**:
    - `stations`: EV charging station data (bilingual names, approval status, trust level).
    - `reports`: User-submitted station status reports.
    - `evVehicles`: Catalog of EV models.
    - `userVehicles`: User's owned vehicles.
    - `chargingSessions`: Tracks charging sessions (duration, energy, linked to user vehicles).
    - `stationVerifications`: Records user verifications of station status.
    - `trust_events`: Logs events for the user trust system.
    - `users`: User profiles with authentication details, roles, `trustScore`, and `userTrustLevel`.

### Shared Code

- **`shared/` directory**: Contains `schema.ts` (database schema and Zod insert schemas) and `routes.ts` (API route definitions with validation).

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`), Drizzle ORM.
- **Mapping**: Leaflet, OpenStreetMap.
- **UI Components**: shadcn/ui, Radix UI.
- **Build & Development**: Vite, esbuild.

## Recent Features

### User Profile & Vehicle Management (January 2026)
- **Purpose**: Allow users to manage their EV vehicles in advance, not just during charging sessions
- **Features**:
  - Profile page at `/profile` accessible by clicking user avatar
  - View list of saved vehicles
  - Add new vehicles from EV catalog or custom entry
  - Set default vehicle (auto-selected when starting charging sessions)
  - Delete vehicles with confirmation
- **Component**: `client/src/pages/Profile.tsx`
- **Access**: Click user avatar in header when logged in
- **Bilingual Support**: Full Arabic/English with RTL support

### First-Visit Onboarding (January 2026)
- **Purpose**: Professional one-screen welcome for first-time visitors
- **Display Logic**: Shows only on first visit (localStorage key: "bariq_onboarding_dismissed")
- **Content**:
  - Headline: "Find reliable EV charging stations"
  - Problem statement: Why users need this app
  - Trust section: Community-driven verification explanation
  - 3 quick how-to bullet points
- **Dismissal**: CTA button "Get started" / "ابدأ الآن" or X skip button
- **Persistence**: Once dismissed, never shows again
- **Non-blocking**: Does not require login, skippable instantly
- **Component**: `client/src/components/Onboarding.tsx`
- **Bilingual Support**: Full Arabic/English with RTL support

### Progressive Web App (PWA) - January 2026
- **Purpose**: Enable app installation on mobile devices without app store
- **Features**:
  - Installable on Android/iOS home screen
  - Works offline with cached data
  - Arabic-first manifest with RTL support
  - Custom app icon with lightning bolt branding
  - Background caching of map tiles (OpenStreetMap)
  - NetworkFirst caching for API with offline fallback
- **Files**:
  - `client/public/manifest.json` - PWA manifest (Arabic)
  - `client/public/sw.js` - Service worker with caching strategies
  - `client/public/icons/` - App icons (72-512px)
- **Cache Strategy**:
  - Map tiles: CacheFirst (max 200 tiles, 30 day TTL)
  - Fonts: CacheFirst (static, no expiry)
  - API data: NetworkFirst with offline fallback (max 50 entries)
- **Installation**: Visit site on mobile → Browser menu → "Add to Home Screen"

### Mobile Map Interaction Control - January 2026
- **Purpose**: Prevent accidental map movement during page scrolling on mobile devices
- **Problem Solved**: Map was capturing touch gestures, causing accidental movement instead of smooth page scrolling
- **Solution**: Uber/Google Maps-style interaction control
- **Features**:
  - Map dragging/touch/zoom disabled by default
  - "Move map" button to enable map interaction
  - "Lock map" button to disable interaction when done
  - Fullscreen mode with auto-enabled interaction
  - Page scrolling works smoothly by default
- **State Management**:
  - `isMapInteractionEnabled`: Controls whether map responds to touch
  - `isFullscreen`: Controls fullscreen overlay mode
- **Component**: `client/src/components/StationMap.tsx`
- **Props Changed**: MapContainer now has `dragging={false}`, `touchZoom={false}`, `scrollWheelZoom={false}`, `doubleClickZoom={false}` by default
- **New Controls**: 
  - `MapInteractionControl` component toggles Leaflet interaction handlers
  - Fullscreen toggle button (top-left corner)

### Hybrid Community Verification System - January 2026
- **Purpose**: Auto-update station status based on community votes
- **Priority 1 - Trusted Users**: Users with TRUSTED level can change station status immediately with a single vote
  - WORKING vote → Station becomes OPERATIONAL
  - NOT_WORKING vote → Station becomes OFFLINE
  - BUSY vote → No status change
- **Priority 2 - Community Consensus**: For non-trusted users, requires 3+ votes with clear majority
  - 3+ NOT_WORKING votes (strictly greater than WORKING and BUSY) → Station becomes OFFLINE
  - 3+ WORKING votes (strictly greater than NOT_WORKING and BUSY) → Station becomes OPERATIONAL
  - Ties or no clear consensus → No status change
- **BUSY votes**: Never change station status, only affect display
- **Implementation**: `server/routes.ts` in station verification endpoint
- **Admin Override**: Admins can still manually change station status in station details page

### Charging Session Screenshot Upload - January 2026
- **Purpose**: Allow optional charger screen photo uploads when ending sessions for data verification
- **Features**:
  - Optional photo upload when ending a charging session
  - Captures charger screen data (energy, duration, etc.) for verification
  - Uses Replit Object Storage with presigned URL upload flow
  - Mobile camera capture support with `capture="environment"` attribute
- **Implementation**:
  - Schema: `chargingSessions.screenshotPath` stores the object storage path
  - Backend: `server/replit_integrations/object_storage/` handles uploads
  - Frontend: `ActiveSessionBanner.tsx` includes upload button in end session dialog
- **API Flow**:
  1. POST `/api/uploads/request-url` - Get presigned upload URL
  2. PUT to presigned URL - Upload file directly to storage
  3. POST `/api/charging-sessions/:id/end` with `screenshotPath` - Save path with session
- **Bilingual Support**: Full Arabic/English translations for upload UI

### User Station Deletion - January 2026
- **Purpose**: Allow users to delete stations they added themselves to fix incorrect entries
- **Authorization**: Users can ONLY delete stations where `addedByUserId` matches their user ID
- **Security**: Backend validates ownership before allowing deletion
- **UI/UX**:
  - "You added this station" badge appears for station owners
  - Delete button with confirmation dialog
  - Redirects to home after successful deletion
- **Implementation**:
  - Backend: `DELETE /api/stations/:id` with ownership check
  - Frontend: `StationDetails.tsx` with AlertDialog confirmation
  - Storage: `deleteStation()` method in `server/storage.ts`
- **Bilingual Support**: Arabic/English translations

### AI-Powered OCR for Charging Screen Photos - January 2026
- **Purpose**: Automatically extract kWh energy values from uploaded charging screen photos
- **Technology**: OpenAI GPT-4o Vision via Replit AI Integrations
- **Features**:
  - Auto-detects energy (kWh) from charger display photos
  - Only accepts high-confidence readings (ignores unclear images)
  - Auto-fills energy field only when AI is confident
  - Falls back to manual entry for unclear/unreadable photos
  - Photo is always saved for reference regardless of OCR result
  - Rate limited (5 OCR requests per 15 minutes)
- **Security**:
  - Server-side image fetching (prevents SSRF)
  - Only accepts object storage paths (no external URLs)
  - Images converted to base64 and sent to AI server-side
- **Implementation**:
  - Backend: `server/replit_integrations/image/client.ts` - `analyzeChargingScreenshot()` function
  - API: `POST /api/ocr/analyze-charging-screen` with `{ objectPath: "/objects/..." }`
  - Frontend: `ActiveSessionBanner.tsx` - calls OCR after photo upload
- **Behavior**:
  - High confidence: Auto-fills energy value, shows success message
  - Low/medium confidence: Saves photo, asks user to enter value manually
  - No detection: Saves photo, asks user to enter value manually
- **Bilingual Support**: Arabic/English for all OCR feedback messages

## Future Feature: Tesla Wall Connector Integration (Planned)

### Overview
Automatic charging session tracking via Tesla Wall Connector Gen 3 local API.

### How It Will Work
1. **Local Bridge Device** (Raspberry Pi or similar) runs on user's home network
2. **Polls Tesla Wall Connector** every 30 seconds via local API:
   - `http://<CHARGER_IP>/api/1/vitals` - Real-time charging data
   - `http://<CHARGER_IP>/api/1/lifetime` - Cumulative statistics
3. **Detects charging events automatically**:
   - `vehicle_connected` + `contactor_closed` → Start session
   - `contactor_closed` = false → End session
4. **Sends data to Bariq server** via secure API endpoint
5. **Creates/updates charging sessions** without user intervention

### Available Data from Tesla Wall Connector Gen 3
- `session_energy_wh` - Energy charged in current session (Wh)
- `vehicle_connected` - Is vehicle plugged in
- `contactor_closed` - Is charging active
- `session_s` - Current session duration (seconds)
- `vehicle_current_a` - Current draw (amps)
- `voltageA_v`, `voltageB_v`, `voltageC_v` - Voltage per phase

### Implementation Requirements
1. **New API endpoint**: `POST /api/charging-sessions/auto-create` (authenticated via API key)
2. **Bridge script** for Raspberry Pi (Python or Node.js)
3. **User setup flow**: Link home charger IP + generate API key
4. **Station matching**: Associate home charger with user's HOME station

### Reference
- Python library: `tesla-wall-connector` (PyPI)
- API is undocumented but stable since 2021