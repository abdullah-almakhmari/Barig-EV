# Trust Score v1 - Implementation Documentation

## Overview

The Trust Score feature provides a deterministic score (0-100) for each charging station based on community activity and data quality. This helps users quickly assess the reliability of station information.

## Feature Flag

**Environment Variable:** `TRUST_SCORE_ENABLED`
- Default: `false` (feature disabled)
- To enable: Set `TRUST_SCORE_ENABLED=true`

When the flag is `false`:
- API endpoint `/api/stations/:id/trust-score` returns 404
- UI badge component renders nothing
- No changes to existing behavior

## Scoring Formula (0-100 points)

### 1. Verification Score (40 points max)
- **Base verifications:** 5 points per verification (max 20 points)
- **Recent verifications (7 days):** 5 points per recent verification (max 20 points)

### 2. Report Reliability Score (30 points max)
- Starts at 30 points
- Deducts 10 points per unresolved recent report (last 30 days)
- Minimum: 0 points

### 3. Recency Score (30 points max)
Based on last activity (verification, report, or station update):
- Within 24 hours: 30 points
- Within 3 days: 25 points
- Within 7 days: 20 points
- Within 14 days: 15 points
- Within 30 days: 10 points
- Older: 5 points

### Trust Level Labels

| Score Range | English Label   | Arabic Label   |
|-------------|-----------------|----------------|
| 80-100      | Highly Trusted  | موثوق جداً     |
| 60-79       | Trusted         | موثوق          |
| 40-59       | Moderate        | متوسط          |
| 20-39       | Low Trust       | ثقة منخفضة     |
| 0-19        | Unverified      | غير متحقق      |

## API Endpoint

**GET** `/api/stations/:id/trust-score`

### Response (when enabled)
```json
{
  "score": 75,
  "label": {
    "en": "Trusted",
    "ar": "موثوق"
  },
  "components": {
    "verificationScore": 25,
    "reportScore": 30,
    "recencyScore": 20
  }
}
```

### Response (when disabled)
```json
{
  "message": "Feature not available"
}
```
Status: 404

## UI Changes

Only one UI change on the Station Details page:
- A small badge below the station name showing the trust score
- Component: `client/src/components/TrustScoreBadge.tsx`
- Data test ID: `trust-score-badge`

## Files Modified

### New Files
- `server/features/trustScore.ts` - Scoring logic and feature flag
- `client/src/components/TrustScoreBadge.tsx` - UI badge component
- `docs/TRUST_SCORE_V1.md` - This documentation

### Modified Files
- `server/routes.ts` - Added trust-score API endpoint
- `client/src/pages/StationDetails.tsx` - Added TrustScoreBadge component

## Test Plan

### Test Case 1: High Trust (Expected Score ~70-100)
- Station with 4+ verifications in last 7 days
- No unresolved reports
- Activity within 24 hours

### Test Case 2: Medium Trust (Expected Score ~40-69)
- Station with 1-2 verifications
- 1 unresolved report
- Activity within 7 days

### Test Case 3: Low Trust (Expected Score ~0-39)
- Station with 0 verifications
- 3+ unresolved reports
- No recent activity (>30 days)

### Feature Flag Verification
1. Set `TRUST_SCORE_ENABLED=false`
2. Restart server
3. Call `/api/stations/:id/trust-score`
4. Verify: Returns 404 with "Feature not available"
5. Verify: UI badge does not appear on station details page

## How to Enable Safely

1. **Test in development first:**
   ```bash
   # Set environment variable
   TRUST_SCORE_ENABLED=true
   
   # Restart server
   npm run dev
   ```

2. **Verify functionality:**
   - Check API endpoint returns scores
   - Verify UI badge appears on station details
   - Test across different stations

3. **Enable in production:**
   - Add `TRUST_SCORE_ENABLED=true` to production environment
   - Deploy/restart

## Rollback Instructions

### Immediate Rollback (No Code Changes)
1. Set `TRUST_SCORE_ENABLED=false` in environment
2. Restart application
3. Feature is completely disabled - app behaves as before

### Full Code Rollback
If git branch is used:
```bash
# Switch back to main branch
git checkout main
```

If committed to main:
```bash
# Revert the commits
git revert <commit-hash>
```

### Verification After Rollback
1. API endpoint returns 404
2. No trust score badge on station details page
3. All existing functionality works normally

## Limitations (v1)

- No dashboard or analytics
- No filtering/sorting by trust score
- Score is read-only (no manual overrides)
- No export functionality
- Map view unchanged
