# Digital Art Space — Artist Application System

This patch lets an existing viewer submit or complete an artist-verification application without creating another account. It adds application details (optional portfolio URL, artist bio, and statement), stores them in a new table, and displays them in the existing Admin Studio review queue.

## Before deploying

1. Back up your project and commit your current working branch.
2. Run `artist-applications-migration.sql` once in the same TiDB database used by the site. It creates `artist_applications` and does not alter existing users, artists, or artworks.
3. Merge these files into the project:
   - Replace root `auth.js` and `auth.css` with the versions in this patch.
   - Replace root `admin.js` and `admin.css` with the versions in this patch (these include the existing Admin Studio code plus application details).
   - Add `api/artist/apply.js`.
   - Replace `api/admin/artists.js` with the version in this patch (it includes the existing Admin Studio routes plus the application-detail query).
4. Do not replace the whole project folder, `package.json`, database credentials, or environment variables.
5. Run `npm install`, then test using a Vercel Preview deployment.

## Viewer application flow

- A signed-in viewer sees **Apply as artist**. A viewer whose signup already set `artist_status` to `pending` sees **Complete application**.
- The application form accepts an optional HTTP(S) portfolio URL, an artist bio (30–1,200 characters), and a statement (30–1,500 characters).
- The server reads the account from the signed session, validates the request and same-origin header, and only allows viewer accounts with `none` or `pending` application status.
- Submitting sets `artist_status` to `pending`; it does not grant artist privileges.
- Admin Studio displays the application details. Approval still requires the admin to select an unassigned artist profile, and only the existing admin endpoint can change the account to verified.
- Rejection returns the user to `none`; the saved details remain so the viewer can edit and resubmit later.

## Preview test checklist

1. Sign in with a normal viewer account and submit a valid application.
2. Confirm the navigation status changes to **Artist application pending** and the application button changes to **Complete application**.
3. Open Admin Studio and confirm the application appears with the bio, statement, and portfolio link.
4. Reject it, sign back in as that viewer, edit and resubmit, and confirm it appears again.
5. Approve it by linking an unassigned artist profile. Confirm `/api/me` reports role `artist` and status `verified`, and Artist Studio becomes available once the Artist Portal patch is deployed.
6. Confirm a viewer cannot call artist profile/artwork APIs before approval.

The patch has been syntax-checked locally but has not been tested against your live TiDB database or Vercel deployment. Keep secrets out of GitHub and never paste environment-variable values into chat.