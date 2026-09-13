# TODO - Webinar Coordinator Dashboard UI Fix

## Completed
- (none yet)

## Next steps
1. Update `frontend/src/components/webinar/Adminpage.jsx`:
   - Change filter wrapper layout for `activeView === 'webinarDocs'` (Webinar Details Active Page) to be a single-row layout.
   - Change filter wrapper layout for `activeView === 'prizeWinners'` (Prize Winner Details) to be a single-row layout.
   - Ensure filters don’t wrap to a new line; if width is insufficient, allow horizontal scrolling.
2. Update `frontend/src/components/webinar/AdminDashboard.css`:
   - Add/adjust CSS classes to support single-row filters with horizontal scrolling on small screens.
   - Ensure existing horizontal table scrolling wrappers keep working.
3. Run frontend lint/build (if available) to confirm no syntax/CSS issues.

## Status
- Step 1: Applied single-row filter layout changes in `Adminpage.jsx`.
- Step 2: Added `.filters-single-row` styling in `AdminDashboard.css`.


