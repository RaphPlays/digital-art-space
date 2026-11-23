# Digital Art Space — Community features

This branch adds moderated artwork feedback and a privacy-minimal international visitor dashboard.

## Database setup

Run these two SQL files once against the same TiDB database used by the Vercel project:

1. `database/artwork-feedback-migration.sql`
2. `database/visitor-analytics-migration.sql`

They create new tables only and do not rewrite existing users, artists, or artworks.

## Artwork comments and ratings

- Signed-in non-admin users can submit one combined feedback entry per artwork.
- A feedback entry can contain a 1–5 rating, a comment, or both.
- Comments must be 3–2,000 characters when supplied.
- New submissions and edits enter the pending queue.
- Only approved feedback is visible in the public artwork detail dialog.
- Re-submitting replaces the user's previous entry for that artwork and sends it back to moderation.
- Users can delete their own feedback through the API.
- Admins review entries at `/feedback-admin.html`, linked from Admin Studio.

API routes share one Vercel Function: `/api/feedback/[action]`. Supported actions are `artwork`, `submit`, `queue`, `moderate`, and `remove`.

## International visitor dashboard

- The gallery API aggregates page visits by Vercel's two-letter country header.
- No IP addresses, precise coordinates, or individual visitor identifiers are stored.
- The dashboard at `/visitor-dashboard.html` shows the last 30 days, grouped by country.
- These are gallery data-request counts, not unique people. Local development may not provide country attribution.
- Analytics failures do not prevent the public gallery from loading.

The dashboard reuses the existing Admin Studio API route; it does not add a function.

## Vercel Hobby function budget

The feature adds exactly one API route file: `api/feedback/[action].js`. All feedback actions share it. Visitor analytics reuses existing `api/gallery.js` and `api/admin/artists.js` routes. With the existing 11 routes, the project should remain at 12 serverless functions.

## Preview test checklist

1. Run both SQL migrations before testing the preview.
2. Open an artwork while signed out; approved feedback should load and the form should ask the visitor to sign in.
3. Sign in as a viewer, submit a rating and comment, and confirm it does not appear publicly yet.
4. Open Feedback Review as an administrator, approve the entry, then refresh the artwork dialog and confirm it appears.
5. Submit another entry for the same artwork and confirm it returns to pending review.
6. Reject a pending entry and confirm it stays hidden publicly.
7. Open Visitor Dashboard as an administrator. After gallery requests from countries with Vercel country attribution, the 30-day country totals should populate.
8. Confirm Admin Studio artist applications, artist records, artwork records, and uploads still work.

Do not commit database credentials or environment-variable values to GitHub.
