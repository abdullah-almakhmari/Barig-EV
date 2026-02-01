# Bariq - EV Charging Stations App

## Overview

Bariq is an MVP web application for finding EV charging stations in Oman and the GCC, built with React. It features an Arabic-first, RTL interface with English support. Key capabilities include browsing stations on an interactive map, viewing details, reporting statuses, initiating charging sessions, and contributing new station data. The project aims to enhance data reliability through community verification and a professional trust system, ensuring users can quickly determine station availability. An admin panel supports content moderation, aligning with the business vision of providing a reliable and user-friendly EV charging station locator.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with shadcn/ui
- **Maps**: Leaflet + React-Leaflet using OpenStreetMap tiles
- **Internationalization**: i18next with react-i18next for Arabic/English (RTL/LTR switching)
- **UI/UX**: Emphasizes a "5-Second Decision UX" with prominent station status, time context, and recommendation labels. Map markers visually represent station priority. Station details are collapsible. User profile and vehicle management are available, alongside a first-visit onboarding experience. The application also functions as a Progressive Web App (PWA).

### Backend

- **Framework**: Express.js 5 on Node.js with TypeScript
- **API Design**: RESTful endpoints with Zod for validation, defined in `shared/routes.ts`.
- **Authentication**: Custom session-based authentication supporting email/password and Google OAuth, with PostgreSQL session storage and user roles (user/owner/admin).
- **Admin Panel**: For managing user-submitted reports and stations (approval, hiding/restoring).
- **Trust System**: Implements authorization for status changes, tracking user reliability via `trustScore` and `userTrustLevel` (NEW/NORMAL/TRUSTED) for trusted contributions. This includes a hybrid community verification system where trusted users can immediately update status, while non-trusted users require consensus.
- **Station Approval**: User-submitted stations require manual admin approval.
- **Security**: Rate limiting via `express-rate-limit`, CSRF protection using double-submit cookie pattern, and Helmet for security headers.

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM for type-safe queries and migrations.
- **Key Tables**: `stations`, `stationChargers`, `reports`, `evVehicles`, `userVehicles`, `chargingSessions`, `stationVerifications`, `trust_events`, `users`, `teslaConnectors`, `teslaVitalsLog`, `charger_rentals`, `ownershipVerifications`, `rental_requests`, `notifications`.

### Shared Code

- **`shared/` directory**: Contains database schemas and Zod insert schemas, and API route definitions with validation.

### Technical Implementations

- **Mobile Map Interaction**: Default disabled map dragging/touch/zoom with a "Move map" button to prevent accidental movement during scrolling.
- **Charging Session Enhancements**: Optional screenshot upload with OCR (OpenAI GPT-4o Vision) to automatically extract energy values, and user station deletion for self-added stations.
- **Station Management**: Station owners can edit their stations via `/station/:id/edit` page. Features include updating station info (name, city, address), managing chargers (add/edit/delete multiple charger types like AC/DC), setting pricing (free/paid with details), and contact information. Owner verification ensures only the original submitter can modify their station.
- **PWA Update Notification**: Automatic detection of new app versions with user-friendly update prompt. Works on Android and iOS. Service worker checks for updates every hour and shows a notification when a new version is available.
- **Tesla Integrations**:
    - **ESP32 Tesla Wall Connector Integration**: An ESP32 device can bridge Tesla Wall Connector Gen 3 local API data to Bariq, enabling automatic charging session tracking and station status updates.
    - **Real-time Charging Visualization**: Stations with active ESP32 charging sessions display orange pulsing markers on the map and show "Charging" status on the station details page. Auto-tracked sessions cannot be manually cancelled to preserve data integrity.
    - **Vitals Data Logging**: All Tesla Wall Connector vitals are stored in `tesla_vitals_log` table for data analytics, including: grid voltage/frequency, 3-phase currents (A/B/C/N), 3-phase voltages, relay voltages, temperatures (PCBA/handle/MCU), pilot signals, EVSE state, alerts, and not-ready reasons.
- **Home Charger Rental System**:
    - **Ownership Verification**: Hybrid system supporting automatic verification via ESP32 devices OR manual verification through admin review. For manual verification, users receive a unique 6-character code, upload photos showing the code with their charger, and admins approve/reject requests. Only verified owners can set rental pricing.
    - **Owner Dashboard**: Users with verified home chargers can set rental pricing (per kWh), availability, and view earnings via the "My Charger" page accessible from Profile.
    - **QR Code Sharing**: Owners can generate and share QR codes for their chargers. Renters scan the QR, navigate to `/rent/:stationId`, and can start a rental request.
    - **Automated Rental Flow**: Renters create a PENDING rental request (15-minute expiry). When charging starts, ESP32 auto-links the session to the renter via `rental_requests` table. Sessions are assigned to renter's history with rental pricing applied.
    - **Rental Pricing Display**: Station details show rental pricing badge for home chargers available for rent.
    - **Session Cost Tracking**: Charging sessions at rental chargers track and display rental costs with "Rental" badge in charging history.
    - **Earnings Analytics**: Owners see total earnings, session counts, and energy delivered in their dashboard.
    - **Automated Notifications**: When a rental session ends, both the renter and owner receive in-app notifications with session details (duration, energy, cost). Notifications are bilingual (Arabic/English) and stored in the database.
- **Notification System**:
    - **In-App Notifications**: Bell icon in header with unread count badge.
    - **Notifications Page**: `/notifications` route showing all user notifications with mark as read and delete functionality.
    - **Notification Types**: `rental_complete` (for renters), `rental_income` (for owners), `session_complete` (for regular sessions).
    - **Bilingual Support**: All notifications have both English and Arabic titles/messages.
## External Dependencies

- **Database**: PostgreSQL
- **Mapping**: Leaflet, OpenStreetMap, OSRM (routing)
- **UI Components**: shadcn/ui, Radix UI
- **AI**: OpenAI GPT-4o Vision (for OCR)
- **Authentication**: Google OAuth
- **Cloud Storage**: Replit Object Storage (for screenshot uploads)