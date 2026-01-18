# Bariq - Feature Inventory

**Audit Date:** January 2026  
**App Version:** Production

---

## 1. Overview

### App Purpose
Bariq (بارق) is an Arabic-first EV charging station finder for Oman and the GCC region. It helps drivers locate reliable charging stations, verify real-time availability through community reports, track charging sessions, and contribute new stations.

### Main User Journeys

1. **Find a Station** → Home → Map/List → Click station → View details → Navigate (Google Maps)
2. **Verify Station Status** → Station Details → Community Verification section → Submit vote (Working/Busy/Not Working)
3. **Report a Problem** → Station Details → Report dialog → Submit report with reason
4. **Add New Station** → Login → Add Station page → Fill form → Submit (pending admin approval)
5. **Start Charging Session** → Station Details → Start Session → Select vehicle → End session when done
6. **Admin Moderation** → Login as admin → Admin Panel → Review reports/approve stations

---

## 2. Current Features

### 2.1 Interactive Map & Station Display

**What it does:** Displays all approved charging stations on an interactive map with markers. Markers are color-coded by availability status.

**Implementation:**
- `client/src/components/StationMap.tsx` - Main map component using Leaflet
- `client/src/hooks/use-stations.ts` - Data fetching hook
- `client/src/pages/Home.tsx` - Home page with map view

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/stations` | List all approved stations (filters: search, city, type) |
| GET | `/api/stations/:id` | Get single station details |

**Database:** Reads from `stations` table (filters by `approvalStatus = 'APPROVED'` and `isHidden = false`)

**External Services:** OpenStreetMap tiles (via Leaflet)

---

### 2.2 Station Details & 5-Second Decision UX

**What it does:** Shows comprehensive station info with a prominent status banner for quick decision-making. Includes charger type, power output, pricing, and location.

**Implementation:**
- `client/src/pages/StationDetails.tsx` - Main detail page
- `client/src/components/StationCard.tsx` - Card component for list views

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/stations/:id` | Get station details |
| GET | `/api/stations/:id/verification-summary` | Get community verification summary |
| GET | `/api/stations/:id/reports` | Get reports for station |

**Database:** Reads `stations`, `station_verifications`, `reports`

---

### 2.3 Community Verification System

**What it does:** Allows logged-in users to vote on station status (Working/Busy/Not Working). Votes within 30 minutes form consensus.

**Implementation:**
- `client/src/pages/StationDetails.tsx` (verification section)
- `server/routes.ts` lines 184-216 (verification endpoints)
- `server/storage.ts` - `submitVerification()`, `getVerificationSummary()`

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/stations/:id/verify` | Submit verification vote |
| GET | `/api/stations/:id/verification-summary` | Get aggregated verification data |

**Database:**
- **Writes:** `station_verifications` (stationId, userId, vote, createdAt)
- **Reads:** Aggregates votes from last 30 minutes

---

### 2.4 User Trust System

**What it does:** Tracks user reliability internally. Trusted users (score ≥10) see a badge. Score increases for accurate verifications/reports, decreases for contradictions.

**Implementation:**
- `server/trust/trustSystem.ts` - Core trust logic
- `client/src/components/TrustedUserBadge.tsx` - Badge display
- `shared/schema.ts` - `trust_events` table

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users/:id/trust-level` | Get user's trust level for badge |

**Database:**
- **Reads/Writes:** `users.trustScore`, `users.userTrustLevel`
- **Writes:** `trust_events` (for idempotency tracking)

**Trust Levels:**
- NEW: score < 5
- NORMAL: score 5-9
- TRUSTED: score ≥ 10 (shows badge)

---

### 2.5 Problem Reporting

**What it does:** Users can report issues with stations (broken charger, incorrect info, etc.). Reports go to admin panel for review.

**Implementation:**
- `client/src/components/ReportDialog.tsx` - Report form
- `server/routes.ts` lines 183-211 (report creation)
- `server/storage.ts` - `createReport()`

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/reports` | Create new report |
| GET | `/api/stations/:id/reports` | Get reports for a station |

**Database:**
- **Writes:** `reports` (stationId, userId, status, reason, reviewStatus)
- **Reads:** `reports` by stationId

---

### 2.6 Station Submission & Admin Approval

**What it does:** Authenticated users can submit new stations. Stations start as PENDING and require admin approval before appearing publicly.

**Implementation:**
- `client/src/pages/AddStation.tsx` - Submission form
- `client/src/components/MapPicker.tsx` - Location picker
- `server/routes.ts` lines 85-100 (station creation)
- `server/storage.ts` - `createStation()`

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/stations` | Create new station (requires auth, rate limited) |

**Database:**
- **Writes:** `stations` (with `approvalStatus = 'PENDING'` for user submissions)

**Rate Limiting:** 10 creates per hour per IP

---

### 2.7 Charging Session Tracking

**What it does:** Users can start/end charging sessions, optionally tracking battery levels and linking to their vehicles. Updates station availability.

**Implementation:**
- `client/src/components/ChargingSessionDialog.tsx` - Session dialog
- `client/src/components/ActiveSessionBanner.tsx` - Active session indicator
- `client/src/pages/ChargingHistory.tsx` - Session history
- `server/routes.ts` lines 257-370 (session endpoints)

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/charging-sessions/start` | Start new session |
| POST | `/api/charging-sessions/:id/end` | End session |
| GET | `/api/charging-sessions` | List user's sessions |
| GET | `/api/charging-sessions/my-active` | Get user's active session |
| GET | `/api/stations/:id/active-session` | Check if station has active session |

**Database:**
- **Writes:** `charging_sessions` (stationId, userId, userVehicleId, timestamps, battery data)
- **Updates:** `stations.availableChargers` (decrement on start, increment on end)

---

### 2.8 Multi-Vehicle Support

**What it does:** Users can save multiple EVs to their profile, select a default vehicle for sessions.

**Implementation:**
- `client/src/components/VehicleSelector.tsx` - Vehicle selection
- `server/routes.ts` lines 392-514 (vehicle endpoints)
- `server/storage.ts` - vehicle CRUD operations

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/vehicles` | List all EV models (catalog) |
| GET | `/api/user-vehicles` | List user's saved vehicles |
| POST | `/api/user-vehicles` | Add vehicle to user's garage |
| PATCH | `/api/user-vehicles/:id` | Update vehicle |
| DELETE | `/api/user-vehicles/:id` | Remove vehicle |
| POST | `/api/user-vehicles/:id/set-default` | Set as default vehicle |

**Database:**
- **Reads:** `ev_vehicles` (catalog)
- **Writes:** `user_vehicles` (userId, evVehicleId, nickname, isDefault)

---

### 2.9 Authentication (Email/Password + Google OAuth)

**What it does:** Custom authentication supporting email/password registration and Google OAuth login. Sessions stored in PostgreSQL.

**Implementation:**
- `server/auth/customAuth.ts` - Main auth logic
- `client/src/pages/AuthPage.tsx` - Login/Register UI
- `client/src/hooks/use-auth.ts` - Auth state hook

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout and destroy session |
| GET | `/api/auth/user` | Get current user |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

**Database:**
- **Reads/Writes:** `users` (id, email, passwordHash, provider, role, trustScore)
- **Writes:** `sessions` (sid, sess, expire)

**Environment Variables:**
- `SESSION_SECRET` - Session encryption secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DATABASE_URL` - PostgreSQL connection string

---

### 2.10 Admin Panel

**What it does:** Allows admin users to review reports, approve/reject stations, and hide problematic content.

**Implementation:**
- `client/src/pages/AdminPanel.tsx` - Admin UI
- `server/routes.ts` lines 516-645 (admin endpoints)

**API Routes:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/reports` | Get all reports with details |
| PATCH | `/api/admin/reports/:id/review` | Update report review status |
| GET | `/api/admin/stations` | Get all stations (including hidden/pending) |
| PATCH | `/api/admin/stations/:id/visibility` | Hide/restore station |
| PATCH | `/api/admin/stations/:id/approval` | Approve/reject station |
| GET | `/api/admin/stations/:id/report-count` | Get report count for station |

**Authorization:** Requires `users.role = 'admin'`

---

### 2.11 First-Visit Onboarding

**What it does:** Shows a one-screen welcome overlay for first-time visitors explaining the app's purpose and how to use it.

**Implementation:**
- `client/src/components/Onboarding.tsx` - Onboarding overlay
- `client/src/App.tsx` - Integration at app root

**localStorage Key:** `bariq_onboarding_dismissed`

**No API Routes** - Client-side only

---

### 2.12 Bilingual Support (Arabic/English)

**What it does:** Full RTL support for Arabic, language toggle in header, all UI text translated.

**Implementation:**
- `client/src/lib/i18n.ts` - Translation strings (~450 entries)
- `client/src/components/LanguageContext.tsx` - Language state management
- `client/src/components/LanguageToggle.tsx` - Toggle UI

**localStorage Key:** None (uses i18next default)

---

## 3. Database Schema

### Tables in Public Schema

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `stations` | Charging station data | `id` (serial) |
| `reports` | User problem reports | `id` (serial) |
| `ev_vehicles` | EV model catalog | `id` (serial) |
| `user_vehicles` | User's saved vehicles | `id` (serial) |
| `charging_sessions` | Charging session records | `id` (serial) |
| `station_verifications` | Community status votes | `id` (serial) |
| `trust_events` | Trust score change log | `id` (serial) |
| `users` | User accounts | `id` (varchar/UUID) |
| `sessions` | Express sessions | `sid` (varchar) |

### Key Relationships (Logical, No FK Constraints)

```
users.id → reports.userId
users.id → user_vehicles.userId
users.id → charging_sessions.userId
users.id → station_verifications.userId
users.id → trust_events.userId
users.id → stations.addedByUserId

stations.id → reports.stationId
stations.id → charging_sessions.stationId
stations.id → station_verifications.stationId

ev_vehicles.id → user_vehicles.evVehicleId
user_vehicles.id → charging_sessions.userVehicleId
```

### Foreign Key Constraints (13 Total)

| Table | Column | References | ON DELETE |
|-------|--------|------------|-----------|
| `reports` | `station_id` | `stations.id` | CASCADE |
| `reports` | `user_id` | `users.id` | SET NULL |
| `reports` | `reviewed_by` | `users.id` | SET NULL |
| `user_vehicles` | `user_id` | `users.id` | CASCADE |
| `user_vehicles` | `ev_vehicle_id` | `ev_vehicles.id` | RESTRICT |
| `charging_sessions` | `station_id` | `stations.id` | CASCADE |
| `charging_sessions` | `user_id` | `users.id` | SET NULL |
| `charging_sessions` | `user_vehicle_id` | `user_vehicles.id` | SET NULL |
| `station_verifications` | `station_id` | `stations.id` | CASCADE |
| `station_verifications` | `user_id` | `users.id` | CASCADE |
| `trust_events` | `user_id` | `users.id` | CASCADE |
| `trust_events` | `station_id` | `stations.id` | SET NULL |
| `stations` | `added_by_user_id` | `users.id` | SET NULL |

**Cascade Behavior:**
- Deleting a station cascades to its reports, sessions, and verifications
- Deleting a user cascades to their vehicles, verifications, and trust events
- Deleting a user sets their references to NULL in reports, sessions, and stations they added

---

## 4. Auth / Sessions

### Authentication Methods
1. **Email/Password** - Standard registration with bcrypt password hashing
2. **Google OAuth** - Optional, enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Session Configuration
- **Store:** PostgreSQL via `connect-pg-simple`
- **TTL:** 7 days (604,800,000 ms)
- **Cookie:** `connect.sid`, HttpOnly, Secure in production, SameSite=Lax

### Session Rules
- Single session per browser (cookie-based)
- No auto-logout on inactivity (expires after 7 days)
- Session destroyed on explicit logout

### User Roles
- `user` (default) - Standard access
- `owner` - Can update their own stations
- `admin` - Full admin panel access

---

## 5. Map / Geo

### User Location
- **API:** `navigator.geolocation.getCurrentPosition()`
- **Used in:**
  - `client/src/components/StationMap.tsx` (locate me button)
  - `client/src/pages/NearbyStations.tsx` (auto-detect on load)
  - `client/src/pages/AddStation.tsx` (use my location for new stations)

### Station Display
- **Library:** Leaflet + React-Leaflet
- **Tiles:** OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Markers:** Custom colored markers based on station status/availability

### Station Filtering
- By search term (name)
- By city
- By charger type (AC/DC/Both)
- By availability status

### Google Maps Directions
- Opens external link: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- **Used in:**
  - `client/src/pages/StationDetails.tsx` (Navigate button)
  - `client/src/components/StationCard.tsx` (Navigate icon)

---

## 6. Bilingual / i18n

### Implementation
- **Library:** i18next + react-i18next
- **Default Language:** Arabic (`ar`)
- **Fallback:** English (`en`)

### Translation Storage
- **File:** `client/src/lib/i18n.ts`
- **Structure:** Single file with `resources.en.translation` and `resources.ar.translation` objects
- **Count:** ~220 translation keys per language

### RTL Handling
- **Context:** `client/src/components/LanguageContext.tsx`
- Sets `document.dir = 'rtl'` or `'ltr'` based on language
- Sets `document.documentElement.lang`

### Language Toggle
- **Component:** `client/src/components/LanguageToggle.tsx`
- Located in header, toggles between AR/EN

---

## 7. Known Issues / Gaps

### Functional Issues

1. ~~**No FK Cascade Rules**~~ - **RESOLVED (January 2026)** - 13 Foreign Key constraints now enforce referential integrity. See `DATABASE_INTEGRITY_MIGRATION.md` for details.

2. **Google OAuth Callback URL** - Requires `APP_URL` environment variable to be set correctly for production. Uses `REPLIT_DEV_DOMAIN` for development.

3. **Rate Limiting by IP** - May affect shared network users (e.g., behind NAT). Consider user-based limits for authenticated endpoints.

### Missing Validations

1. **Email Verification** - `emailVerified` field exists but no verification flow is implemented.

2. **Password Reset** - No forgot password functionality.

3. **Station Coordinates Validation** - No check that coordinates are within GCC region.

### Security Gaps

1. **No CSRF Protection** - Consider adding `csurf` middleware for form submissions.

2. **Admin Role Assignment** - No UI for promoting users to admin. Must be done via direct database update.

### Performance Considerations

1. **Trust System Queries** - Runs sliding window queries on every verification. Index exists on `trust_events` but monitor performance at scale.

2. **No Pagination** - Station list, reports, and sessions endpoints return all records. Add pagination for scale.

3. **No Caching** - No Redis or in-memory cache for frequently accessed data.

### Preview vs Production

| Feature | Preview | Production |
|---------|---------|------------|
| Google OAuth | Works (uses dev domain) | Requires `APP_URL` env var |
| Session Cookies | Secure=false | Secure=true |
| Seed Data | Loaded on startup | Same (consider removing) |

---

## 8. Runbook

### Running Locally

```bash
# Install dependencies
npm install

# Start development server (runs both backend and frontend)
npm run dev

# The app runs on http://localhost:5000
```

### Database Operations

```bash
# Push schema changes to database
npm run db:push

# Force push (if conflicts)
npm run db:push --force

# Generate migrations (not typically needed)
npm run db:generate
```

### Publishing/Deploying

1. Ensure `APP_URL` is set to your production domain
2. Verify `SESSION_SECRET` is set (required)
3. Verify Google OAuth credentials are set (optional but recommended)
4. Click "Publish" in Replit or use `suggest_deploy`

### Reset Test Data

```sql
-- Clear all user-generated data (preserves seed stations)
TRUNCATE TABLE reports RESTART IDENTITY;
TRUNCATE TABLE charging_sessions RESTART IDENTITY;
TRUNCATE TABLE station_verifications RESTART IDENTITY;
TRUNCATE TABLE trust_events RESTART IDENTITY;
TRUNCATE TABLE user_vehicles RESTART IDENTITY;

-- Reset user trust scores
UPDATE users SET trust_score = 0, user_trust_level = 'NEW';

-- Clear sessions (logs everyone out)
TRUNCATE TABLE sessions;

-- Reset all stations to approved (if testing approval workflow)
UPDATE stations SET approval_status = 'APPROVED' WHERE approval_status = 'PENDING';

-- Delete user-submitted stations (preserves seed data)
DELETE FROM stations WHERE added_by_user_id IS NOT NULL;

-- Full reset (DANGER: deletes everything including seed data)
TRUNCATE TABLE stations RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
```

### Creating an Admin User

```sql
-- After user registers, promote to admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Environment Variables Reference

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `DATABASE_URL` | Secret | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Secret | Yes | Session encryption key |
| `GOOGLE_CLIENT_ID` | Secret | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | No | Google OAuth client secret |
| `APP_URL` | Env Var | Prod only | Production URL for OAuth callbacks |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Secret | Auto | PostgreSQL connection details (auto-set by Replit) |

---

## File Structure Summary

```
├── client/src/
│   ├── App.tsx                    # App root with routing
│   ├── components/
│   │   ├── Header.tsx             # Navigation header
│   │   ├── StationMap.tsx         # Leaflet map component
│   │   ├── StationCard.tsx        # Station list card
│   │   ├── Onboarding.tsx         # First-visit onboarding
│   │   ├── TrustedUserBadge.tsx   # Trust badge display
│   │   ├── ChargingSessionDialog.tsx # Session management
│   │   ├── ReportDialog.tsx       # Problem reporting
│   │   ├── VehicleSelector.tsx    # Vehicle selection
│   │   ├── LanguageToggle.tsx     # AR/EN toggle
│   │   └── LanguageContext.tsx    # i18n context
│   ├── hooks/
│   │   ├── use-auth.ts            # Auth state hook
│   │   └── use-stations.ts        # Station data hook
│   ├── lib/
│   │   ├── i18n.ts                # Translations
│   │   └── queryClient.ts         # TanStack Query config
│   └── pages/
│       ├── Home.tsx               # Main map/list view
│       ├── StationDetails.tsx     # Station detail page
│       ├── AddStation.tsx         # Add new station
│       ├── NearbyStations.tsx     # Nearby stations list
│       ├── ChargingHistory.tsx    # Session history
│       ├── AuthPage.tsx           # Login/Register
│       └── AdminPanel.tsx         # Admin moderation
├── server/
│   ├── index.ts                   # Server entry point
│   ├── routes.ts                  # API route handlers
│   ├── storage.ts                 # Database operations
│   ├── auth/
│   │   └── customAuth.ts          # Auth configuration
│   └── trust/
│       └── trustSystem.ts         # Trust score logic
└── shared/
    ├── schema.ts                  # Drizzle schema
    ├── models/auth.ts             # User/session schema
    └── routes.ts                  # API route definitions
```

---

*End of Feature Inventory*
