# Data Export - Academic Research Documentation

## Overview

The Data Export feature provides CSV exports of Bariq's datasets for academic research and analysis (e.g., Master's thesis). This is an **admin-only**, **read-only** feature that does not modify any data.

## Privacy & Data Protection

**All exports exclude personally identifiable information:**
- No user emails or names
- No user IDs (completely removed, not anonymized)
- No IP addresses or device information
- Only aggregated counts and station-level data

## Access

**Admin Panel** → **Data Export** tab  
Or directly via API endpoints (requires admin authentication)

## Available Datasets

### 1. Stations Dataset

**Endpoint:** `GET /api/admin/export/stations`  
**Filename:** `stations_export.csv`

| Column | Type | Description |
|--------|------|-------------|
| station_id | integer | Unique station identifier |
| latitude | float | GPS latitude coordinate |
| longitude | float | GPS longitude coordinate |
| charger_type | string | Charger type: "AC", "DC", or "Both" |
| power_kw | float | Charging power in kilowatts (may be empty) |
| trust_score | integer | Computed trust score 0-100 (empty if feature disabled) |
| total_reports | integer | Total number of user reports for this station |
| total_verifications | integer | Total number of community verifications |
| created_at | ISO 8601 | Station creation timestamp |

**Sample CSV:**
```csv
station_id,latitude,longitude,charger_type,power_kw,trust_score,total_reports,total_verifications,created_at
18,23.614328,58.475433,DC,50,60,0,5,2026-01-18T05:43:20.239Z
19,23.618671,58.192345,DC,60,45,2,3,2026-01-18T05:43:20.239Z
```

---

### 2. Charging Sessions Dataset

**Endpoint:** `GET /api/admin/export/sessions`  
**Filename:** `charging_sessions_export.csv`

| Column | Type | Description |
|--------|------|-------------|
| session_id | integer | Unique session identifier |
| station_id | integer | Foreign key to stations table |
| start_time | ISO 8601 | Session start timestamp |
| end_time | ISO 8601 | Session end timestamp (empty if active) |
| duration_minutes | integer | Computed session duration in minutes |
| created_at | ISO 8601 | Record creation timestamp |

**Sample CSV:**
```csv
session_id,station_id,start_time,end_time,duration_minutes,created_at
1,18,2026-01-18T10:30:00.000Z,2026-01-18T11:15:00.000Z,45,2026-01-18T10:30:00.000Z
2,19,2026-01-18T14:00:00.000Z,,,,2026-01-18T14:00:00.000Z
```

---

### 3. Reports Dataset

**Endpoint:** `GET /api/admin/export/reports`  
**Filename:** `reports_export.csv`

| Column | Type | Description |
|--------|------|-------------|
| report_id | integer | Unique report identifier |
| station_id | integer | Foreign key to stations table |
| report_reason | string | User's reported issue/reason |
| created_at | ISO 8601 | Report submission timestamp |
| resolved | boolean | Whether the report has been resolved ("true"/"false") |

**Sample CSV:**
```csv
report_id,station_id,report_reason,created_at,resolved
1,22,broken,2026-01-18T09:00:00.000Z,false
2,22,offline,2026-01-18T09:30:00.000Z,true
```

---

## How to Export

### Via Admin Panel UI
1. Log in as admin
2. Navigate to Admin Panel
3. Click "Data Export" tab
4. Click "Download CSV" on the desired dataset

### Via Direct API
```bash
# Authenticate first, then:
curl -b cookies.txt "https://your-app.replit.app/api/admin/export/stations" -o stations.csv
curl -b cookies.txt "https://your-app.replit.app/api/admin/export/sessions" -o sessions.csv
curl -b cookies.txt "https://your-app.replit.app/api/admin/export/reports" -o reports.csv
```

---

## Test Steps

1. **Login as admin** (almakhmari001@gmail.com / Admin123!)
2. **Navigate to Admin Panel** (/admin)
3. **Click "Data Export" tab**
4. **Click each "Download CSV" button**
5. **Verify:**
   - File downloads successfully
   - CSV opens correctly in spreadsheet software
   - All columns are present as documented
   - No user personal data appears

---

## Technical Notes

### Streaming
Large datasets are streamed row-by-row to prevent memory issues.

### Character Encoding
UTF-8 encoding for proper Arabic text support.

### CSV Escaping
Fields containing commas, quotes, or newlines are properly escaped.

### Authentication
All export endpoints require:
- Valid session (authenticated user)
- Admin role (`role === "admin"`)

### Rate Limiting
Export endpoints are protected by the general API rate limiter (100 requests/15 minutes).

---

## Files

**Backend:**
- `server/admin/dataExport.ts` - Export logic and CSV generation
- `server/routes.ts` - API endpoint definitions

**Frontend:**
- `client/src/pages/AdminPanel.tsx` - Export UI tab

---

## Limitations

- No filtering by date range (full dataset export only)
- No custom column selection
- No aggregation/summary exports
- Maximum practical size depends on server memory (~100k rows tested)
