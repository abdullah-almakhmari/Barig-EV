# Database Integrity Migration Plan

**Created:** January 2026  
**Status:** COMPLETED  
**Executed:** January 2026  
**Database:** PostgreSQL (Neon)

---

## Migration Results (COMPLETED)

| Step | Action | Result |
|------|--------|--------|
| 1 | Detected orphan records | 8 orphan reports, 3 orphan sessions |
| 2 | Created backup tables | `_backup_orphan_reports` (8 rows), `_backup_orphan_charging_sessions` (3 rows) |
| 3 | Deleted orphan data | 11 records removed |
| 4 | Added FK constraints | 13 constraints added successfully |
| 5 | Verified integrity | All orphan counts = 0 |
| 6 | App restart | Application running normally |

**Backup Tables:** Orphan data preserved in `_backup_orphan_reports` and `_backup_orphan_charging_sessions` for potential restoration.

---

## 1. Schema Analysis

### All 9 Tables

| Table | Primary Key | Type | Purpose |
|-------|-------------|------|---------|
| `users` | `id` | VARCHAR (UUID) | User accounts |
| `sessions` | `sid` | VARCHAR | Express session storage |
| `stations` | `id` | SERIAL (INT) | Charging station data |
| `reports` | `id` | SERIAL (INT) | User problem reports |
| `ev_vehicles` | `id` | SERIAL (INT) | EV model catalog (reference data) |
| `user_vehicles` | `id` | SERIAL (INT) | User's saved vehicles |
| `charging_sessions` | `id` | SERIAL (INT) | Charging session records |
| `station_verifications` | `id` | SERIAL (INT) | Community verification votes |
| `trust_events` | `id` | SERIAL (INT) | Trust score change log |

---

## 2. Logical Relationships Identified

### Relationship Map

```
users (id: VARCHAR/UUID)
  ├── stations.added_by_user_id (nullable) - who added the station
  ├── reports.user_id (nullable) - who created the report
  ├── reports.reviewed_by (nullable) - admin who reviewed
  ├── user_vehicles.user_id (required) - user's garage
  ├── charging_sessions.user_id (nullable) - session owner
  ├── station_verifications.user_id (required) - who verified
  └── trust_events.user_id (required) - trust score recipient

stations (id: SERIAL/INT)
  ├── reports.station_id (required) - station being reported
  ├── charging_sessions.station_id (required) - where charging happened
  ├── station_verifications.station_id (required) - station being verified
  └── trust_events.station_id (nullable) - related station for some events

ev_vehicles (id: SERIAL/INT)
  └── user_vehicles.ev_vehicle_id (required) - which EV model

user_vehicles (id: SERIAL/INT)
  └── charging_sessions.user_vehicle_id (nullable) - which user vehicle
```

---

## 3. Tables That Can Produce Orphan Records

| Relationship | Parent → Child | Currently Orphans | Risk Level |
|--------------|----------------|-------------------|------------|
| stations → reports | Deleting station orphans reports | **8 orphans found** | HIGH |
| stations → charging_sessions | Deleting station orphans sessions | **3 orphans found** | HIGH |
| stations → station_verifications | Deleting station orphans votes | 0 | MEDIUM |
| stations → trust_events | Deleting station orphans events | 0 | LOW |
| users → reports | Deleting user orphans their reports | 0 | MEDIUM |
| users → user_vehicles | Deleting user orphans their vehicles | 0 | HIGH |
| users → charging_sessions | Deleting user orphans their sessions | 0 | MEDIUM |
| users → station_verifications | Deleting user orphans their votes | 0 | MEDIUM |
| users → trust_events | Deleting user orphans their events | 0 | MEDIUM |
| users → stations | Deleting user orphans stations they added | 0 | LOW |
| ev_vehicles → user_vehicles | Deleting EV model orphans user refs | 0 | MEDIUM |
| user_vehicles → charging_sessions | Deleting user vehicle orphans sessions | 0 | LOW |

---

## 4. Proposed Foreign Key Constraints

### Design Decisions with Reasoning

#### 4.1 `reports.station_id → stations.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** Reports are meaningless without their station. If a station is deleted, its reports should be cleaned up automatically. Reports have no value as standalone data.

#### 4.2 `reports.user_id → users.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Reports remain valuable even if the reporting user is deleted. We preserve the report content but remove the user reference. This allows "anonymous" historical data.

#### 4.3 `reports.reviewed_by → users.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Audit trail of who reviewed is nice-to-have, but the review decision (status) is what matters. If admin is deleted, we keep the review status but lose the reviewer reference.

#### 4.4 `user_vehicles.user_id → users.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** User vehicles belong entirely to a user. If user account is deleted, their vehicle records should be cleaned up. No reason to keep orphaned vehicle records.

#### 4.5 `user_vehicles.ev_vehicle_id → ev_vehicles.id`
- **Constraint:** `ON DELETE RESTRICT`
- **Reasoning:** EV catalog items should not be deleted if users reference them. This prevents accidental deletion of catalog data. Admin must first migrate users to a different EV model.

#### 4.6 `charging_sessions.station_id → stations.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** Sessions at a deleted station lose context. Historical session data without station info is not useful. Clean up sessions when station is removed.

#### 4.7 `charging_sessions.user_id → users.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Session history could be anonymized rather than deleted for aggregate statistics. Preserves usage data without user identity.

#### 4.8 `charging_sessions.user_vehicle_id → user_vehicles.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Session history remains valid even if user deletes a vehicle from their garage. The session happened; we just lose the vehicle reference.

#### 4.9 `station_verifications.station_id → stations.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** Verification votes are meaningless without their station. Clean up when station is deleted.

#### 4.10 `station_verifications.user_id → users.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** Verification votes are tied to specific users for trust scoring. If user is deleted, their votes should be removed to maintain trust system integrity.

#### 4.11 `trust_events.user_id → users.id`
- **Constraint:** `ON DELETE CASCADE`
- **Reasoning:** Trust events are only meaningful for existing users. If user is deleted, their trust history should be cleaned up.

#### 4.12 `trust_events.station_id → stations.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Trust events may reference stations, but the event itself (user gained/lost trust) is still meaningful without the station context.

#### 4.13 `stations.added_by_user_id → users.id`
- **Constraint:** `ON DELETE SET NULL`
- **Reasoning:** Stations remain valuable even if the user who added them is deleted. The station data is community property; we just lose attribution.

---

## 5. Current Orphan Records Found

```
reports → stations:           8 orphans
charging_sessions → stations: 3 orphans
All other relationships:      0 orphans
```

---

## 6. Migration Scripts

### 6.1 Script A: Detect Orphan Records (Read-Only)

```sql
-- ============================================
-- SCRIPT A: ORPHAN DETECTION (READ-ONLY)
-- Run this BEFORE any cleanup to identify orphans
-- ============================================

-- Orphan reports (station deleted)
SELECT r.id, r.station_id, r.status, r.reason, r.created_at
FROM reports r 
LEFT JOIN stations s ON r.station_id = s.id 
WHERE s.id IS NULL;

-- Orphan charging sessions (station deleted)
SELECT cs.id, cs.station_id, cs.user_id, cs.start_time, cs.end_time, cs.is_active
FROM charging_sessions cs 
LEFT JOIN stations s ON cs.station_id = s.id 
WHERE s.id IS NULL;

-- Summary count of all orphans
SELECT 'reports → stations' as relationship, COUNT(*) as orphan_count
FROM reports r LEFT JOIN stations s ON r.station_id = s.id WHERE s.id IS NULL
UNION ALL
SELECT 'charging_sessions → stations', COUNT(*)
FROM charging_sessions cs LEFT JOIN stations s ON cs.station_id = s.id WHERE s.id IS NULL;
```

### 6.2 Script B: Clean Existing Orphan Data (DESTRUCTIVE)

```sql
-- ============================================
-- SCRIPT B: ORPHAN CLEANUP (DESTRUCTIVE)
-- Run this AFTER reviewing Script A results
-- Creates backup before deletion
-- ============================================

-- Step 1: Create backup tables (safety net)
CREATE TABLE IF NOT EXISTS _backup_orphan_reports AS
SELECT r.* FROM reports r 
LEFT JOIN stations s ON r.station_id = s.id 
WHERE s.id IS NULL;

CREATE TABLE IF NOT EXISTS _backup_orphan_charging_sessions AS
SELECT cs.* FROM charging_sessions cs 
LEFT JOIN stations s ON cs.station_id = s.id 
WHERE s.id IS NULL;

-- Step 2: Delete orphan reports
DELETE FROM reports 
WHERE id IN (
  SELECT r.id FROM reports r 
  LEFT JOIN stations s ON r.station_id = s.id 
  WHERE s.id IS NULL
);

-- Step 3: Delete orphan charging sessions
DELETE FROM charging_sessions 
WHERE id IN (
  SELECT cs.id FROM charging_sessions cs 
  LEFT JOIN stations s ON cs.station_id = s.id 
  WHERE s.id IS NULL
);

-- Step 4: Verify cleanup
SELECT 'Remaining orphan reports' as check_type, COUNT(*) as count
FROM reports r LEFT JOIN stations s ON r.station_id = s.id WHERE s.id IS NULL
UNION ALL
SELECT 'Remaining orphan sessions', COUNT(*)
FROM charging_sessions cs LEFT JOIN stations s ON cs.station_id = s.id WHERE s.id IS NULL;
```

### 6.3 Script C: Add Foreign Keys (AFTER Cleanup)

```sql
-- ============================================
-- SCRIPT C: ADD FOREIGN KEY CONSTRAINTS
-- Run this AFTER Script B cleanup is complete
-- ============================================

-- 1. reports.station_id → stations.id (CASCADE)
ALTER TABLE reports
ADD CONSTRAINT fk_reports_station
FOREIGN KEY (station_id) REFERENCES stations(id)
ON DELETE CASCADE;

-- 2. reports.user_id → users.id (SET NULL)
ALTER TABLE reports
ADD CONSTRAINT fk_reports_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- 3. reports.reviewed_by → users.id (SET NULL)
ALTER TABLE reports
ADD CONSTRAINT fk_reports_reviewer
FOREIGN KEY (reviewed_by) REFERENCES users(id)
ON DELETE SET NULL;

-- 4. user_vehicles.user_id → users.id (CASCADE)
ALTER TABLE user_vehicles
ADD CONSTRAINT fk_user_vehicles_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- 5. user_vehicles.ev_vehicle_id → ev_vehicles.id (RESTRICT)
ALTER TABLE user_vehicles
ADD CONSTRAINT fk_user_vehicles_ev
FOREIGN KEY (ev_vehicle_id) REFERENCES ev_vehicles(id)
ON DELETE RESTRICT;

-- 6. charging_sessions.station_id → stations.id (CASCADE)
ALTER TABLE charging_sessions
ADD CONSTRAINT fk_charging_sessions_station
FOREIGN KEY (station_id) REFERENCES stations(id)
ON DELETE CASCADE;

-- 7. charging_sessions.user_id → users.id (SET NULL)
ALTER TABLE charging_sessions
ADD CONSTRAINT fk_charging_sessions_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- 8. charging_sessions.user_vehicle_id → user_vehicles.id (SET NULL)
ALTER TABLE charging_sessions
ADD CONSTRAINT fk_charging_sessions_vehicle
FOREIGN KEY (user_vehicle_id) REFERENCES user_vehicles(id)
ON DELETE SET NULL;

-- 9. station_verifications.station_id → stations.id (CASCADE)
ALTER TABLE station_verifications
ADD CONSTRAINT fk_station_verifications_station
FOREIGN KEY (station_id) REFERENCES stations(id)
ON DELETE CASCADE;

-- 10. station_verifications.user_id → users.id (CASCADE)
ALTER TABLE station_verifications
ADD CONSTRAINT fk_station_verifications_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- 11. trust_events.user_id → users.id (CASCADE)
ALTER TABLE trust_events
ADD CONSTRAINT fk_trust_events_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- 12. trust_events.station_id → stations.id (SET NULL)
ALTER TABLE trust_events
ADD CONSTRAINT fk_trust_events_station
FOREIGN KEY (station_id) REFERENCES stations(id)
ON DELETE SET NULL;

-- 13. stations.added_by_user_id → users.id (SET NULL)
ALTER TABLE stations
ADD CONSTRAINT fk_stations_added_by
FOREIGN KEY (added_by_user_id) REFERENCES users(id)
ON DELETE SET NULL;
```

### 6.4 Script D: Verify Integrity After Migration

```sql
-- ============================================
-- SCRIPT D: VERIFICATION (POST-MIGRATION)
-- Run this AFTER Script C to verify all FKs
-- ============================================

-- List all foreign keys in the database
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Final orphan check (should all be 0)
SELECT 'reports → stations' as relationship, COUNT(*) as orphan_count
FROM reports r LEFT JOIN stations s ON r.station_id = s.id WHERE s.id IS NULL
UNION ALL SELECT 'reports → users', COUNT(*)
FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id IS NOT NULL AND u.id IS NULL
UNION ALL SELECT 'user_vehicles → users', COUNT(*)
FROM user_vehicles uv LEFT JOIN users u ON uv.user_id = u.id WHERE u.id IS NULL
UNION ALL SELECT 'user_vehicles → ev_vehicles', COUNT(*)
FROM user_vehicles uv LEFT JOIN ev_vehicles ev ON uv.ev_vehicle_id = ev.id WHERE ev.id IS NULL
UNION ALL SELECT 'charging_sessions → stations', COUNT(*)
FROM charging_sessions cs LEFT JOIN stations s ON cs.station_id = s.id WHERE s.id IS NULL
UNION ALL SELECT 'station_verifications → stations', COUNT(*)
FROM station_verifications sv LEFT JOIN stations s ON sv.station_id = s.id WHERE s.id IS NULL
UNION ALL SELECT 'station_verifications → users', COUNT(*)
FROM station_verifications sv LEFT JOIN users u ON sv.user_id = u.id WHERE u.id IS NULL
UNION ALL SELECT 'trust_events → users', COUNT(*)
FROM trust_events te LEFT JOIN users u ON te.user_id = u.id WHERE u.id IS NULL;
```

---

## 7. Tables Affected Summary

| Table | Constraints Added | Impact |
|-------|-------------------|--------|
| `reports` | 3 FKs (station_id, user_id, reviewed_by) | Cascade delete with station, SET NULL for users |
| `user_vehicles` | 2 FKs (user_id, ev_vehicle_id) | Cascade delete with user, RESTRICT for EV catalog |
| `charging_sessions` | 3 FKs (station_id, user_id, user_vehicle_id) | Cascade delete with station, SET NULL for user/vehicle |
| `station_verifications` | 2 FKs (station_id, user_id) | Cascade delete with both station and user |
| `trust_events` | 2 FKs (user_id, station_id) | Cascade with user, SET NULL for station |
| `stations` | 1 FK (added_by_user_id) | SET NULL when user deleted |

**Total: 13 Foreign Key Constraints**

---

## 8. Risks and Mitigations

### Risk 1: Data Loss During Cleanup
- **Risk:** Script B deletes 8 reports and 3 charging sessions.
- **Mitigation:** Backup tables are created before deletion. Data can be restored if needed.

### Risk 2: Cascade Deletes in Production
- **Risk:** Deleting a station now deletes all related reports and sessions.
- **Mitigation:** This is intentional behavior. Admin panel should warn before station deletion. Consider soft-delete (isHidden) instead of hard delete.

### Risk 3: RESTRICT Blocking EV Catalog Deletion
- **Risk:** Cannot delete EV models if users reference them.
- **Mitigation:** This is intentional - protects catalog integrity. Create a migration plan if EV model needs removal.

### Risk 4: Concurrent Access During Migration
- **Risk:** Data changes during FK addition could cause constraint violations.
- **Mitigation:** Run during low-traffic period. Scripts are designed to be idempotent.

---

## 9. Rollback Plan

### To Remove All Foreign Keys (Rollback)

```sql
-- ============================================
-- ROLLBACK: REMOVE ALL FOREIGN KEYS
-- Use this if FKs cause unexpected issues
-- ============================================

ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_station;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_user;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_reviewer;
ALTER TABLE user_vehicles DROP CONSTRAINT IF EXISTS fk_user_vehicles_user;
ALTER TABLE user_vehicles DROP CONSTRAINT IF EXISTS fk_user_vehicles_ev;
ALTER TABLE charging_sessions DROP CONSTRAINT IF EXISTS fk_charging_sessions_station;
ALTER TABLE charging_sessions DROP CONSTRAINT IF EXISTS fk_charging_sessions_user;
ALTER TABLE charging_sessions DROP CONSTRAINT IF EXISTS fk_charging_sessions_vehicle;
ALTER TABLE station_verifications DROP CONSTRAINT IF EXISTS fk_station_verifications_station;
ALTER TABLE station_verifications DROP CONSTRAINT IF EXISTS fk_station_verifications_user;
ALTER TABLE trust_events DROP CONSTRAINT IF EXISTS fk_trust_events_user;
ALTER TABLE trust_events DROP CONSTRAINT IF EXISTS fk_trust_events_station;
ALTER TABLE stations DROP CONSTRAINT IF EXISTS fk_stations_added_by;
```

### To Restore Deleted Orphans (if backup exists)

```sql
-- Restore orphan reports from backup
INSERT INTO reports SELECT * FROM _backup_orphan_reports;

-- Restore orphan charging sessions from backup
INSERT INTO charging_sessions SELECT * FROM _backup_orphan_charging_sessions;

-- Drop backup tables after restoration
DROP TABLE IF EXISTS _backup_orphan_reports;
DROP TABLE IF EXISTS _backup_orphan_charging_sessions;
```

---

## 10. Execution Order

1. **Review:** Run Script A (detection) to confirm orphan counts
2. **Backup:** Script B creates backup tables automatically
3. **Cleanup:** Execute Script B deletion statements
4. **Verify:** Re-run Script A to confirm 0 orphans
5. **Add FKs:** Execute Script C (all 13 constraints)
6. **Validate:** Run Script D to list all FKs and verify
7. **Test:** Perform application testing to ensure no breakage

---

## 11. App Logic Changes Required

**None.** The current app logic does not perform hard deletes of stations, users, or EV catalog items. All operations are:
- Soft-hide stations (`isHidden = true`)
- Sessions end normally (not deleted)
- Users log out (sessions expire)

The FK constraints provide a safety net for future changes or manual database operations, but do not require any code changes to the application.

---

*End of Migration Plan*
