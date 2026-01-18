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

