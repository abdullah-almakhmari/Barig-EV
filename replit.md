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
- **Key Tables**: `stations`, `reports`, `evVehicles`, `userVehicles`, `chargingSessions`, `stationVerifications`, `trust_events`, `users`.

### Shared Code

- **`shared/` directory**: Contains database schemas and Zod insert schemas, and API route definitions with validation.

### Technical Implementations

- **Mobile Map Interaction**: Default disabled map dragging/touch/zoom with a "Move map" button to prevent accidental movement during scrolling.
- **Charging Session Enhancements**: Optional screenshot upload with OCR (OpenAI GPT-4o Vision) to automatically extract energy values, and user station deletion for self-added stations.
- **Tesla Integrations**:
    - **CSV Import**: Users can import charging history from Tesla app CSV files.
    - **ESP32 Tesla Wall Connector Integration**: An ESP32 device can bridge Tesla Wall Connector Gen 3 local API data to Bariq, enabling automatic charging session tracking and station status updates.

## External Dependencies

- **Database**: PostgreSQL
- **Mapping**: Leaflet, OpenStreetMap
- **UI Components**: shadcn/ui, Radix UI
- **AI**: OpenAI GPT-4o Vision (for OCR)
- **Authentication**: Google OAuth
- **Cloud Storage**: Replit Object Storage (for screenshot uploads)