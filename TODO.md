# Task: Show Planned Webinar Count from Phase in Webinar Dashboard Cards

## Steps:

- [x] Step 1: Analyze codebase (Adminpage.jsx, WebinarDashboard.jsx, WebinarPhase model, server.js API)
- [x] Step 2: Create plan & get approval
- [x] Step 3: Fix `getPhaseData` in WebinarDashboard.jsx - change `planned: 0` → `planned: d.plannedWebinarCount || 0` in phaseDetails[phase] mapping
- [x] Step 4: Fix `generateInitialData` in WebinarDashboard.jsx - change `planned: 0` → `planned: d?.plannedWebinarCount ?? d?.planned ?? 0`
- [x] Step 5: Verify the backend dashboard-stats API already handles plannedWebinarCount correctly

## Summary of Changes:

### File edited: `frontend/src/components/WebinarDashboard.jsx`
### File edited: `frontend/src/components/webinar/Home.jsx`

### WebinarDashboard.jsx Fixes:
1. **`getPhaseData` - Priority 3 (phaseDetails[phase])**: Changed `planned: 0` to `planned: d.plannedWebinarCount || 0` to use the actual planned webinar count from the database instead of hardcoded zero.
2. **`generateInitialData` - Priority 4 fallback**: Changed `planned: 0` to `planned: d?.plannedWebinarCount ?? d?.planned ?? 0` - first checks for `plannedWebinarCount` (from DB), falls back to `planned` (from seed data), then finally to 0.
3. **Backend `/api/dashboard-stats`**: Already correctly reads `plannedWebinarCount` from the WebinarPhase model as the `planned` field.

### Home.jsx Fixes:
1. **Phase format mismatch**: Added `cleanPhase = currentPhase.split(' (')[0]` to extract just the clean phase name (e.g., "Phase 6") from `displayText` (e.g., "Phase 6 (Dec 2025 - Mar 2026)") before passing to `/api/dashboard-stats`.
2. **Added `currentPhaseId` state**: Stored the phase ID from `/api/current-phase` for future use.

**Data flow:** Admin creates phase with plannedWebinarCount → stored in WebinarPhase model → WebinarDashboard fetches from `/api/phases` → getPhaseData reads `plannedWebinarCount` → displays on webinar cards. Home page now correctly passes clean phase name to API.

