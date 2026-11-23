# Admin Studio patch

This patch adds a first admin milestone to the existing Digital Art Space project:

- Admin-only management of artwork records and artist profile records.
- Ability to select the hero slideshow order for artworks.
- Admin review of pending artist applications.
- Browser-to-Vercel image uploads for public artwork and artist images.
- A one-time local script to create or promote an administrator account.

## Files to copy

Copy the new `admin.html`, `admin.css`, `admin.js`, `api/admin/`, `lib/admin-auth.js`, `lib/admin-http.js`, `lib/admin-validation.js`, and `scripts/create-admin.js` into the matching places in your project. Replace `auth.js` with the version in this patch, and merge the dependency change from `package.json` into your existing one. Keep your original artwork images, font, `index.html`, `style.css`, and `script.js`.

## Create the first administrator account

The public sign-up form never creates administrators. To create the first one safely:

1. Make a private local `.env` file using `.env.example` as a guide, and fill in your TiDB Cloud host, username, password, and database name. Do not upload `.env` to GitHub.
2. In the project folder, run `npm install` so the new Blob dependency is installed and your existing `package-lock.json` is updated. Include that updated lockfile in your next Git commit.
3. Run `node --env-file=.env scripts/create-admin.js` from a terminal. Enter the email and display name you want, then enter a password when prompted. The password is hidden while typing.
4. If that email already has an account, the script asks you to type `PROMOTE`, keeps its current password, clears any artist-profile ownership link, and promotes the account. Otherwise it creates a new admin account.
5. Sign in on the live website. The Admin link should appear in the header.

The live Vercel project must already have `SESSION_SECRET` (at least 32 characters) and the TiDB variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` configured in its Environment Variables. Redeploy after adding or changing those variables.

## Blob storage

The upload route supports the custom `DARTS_READ_WRITE_TOKEN` name and the default `BLOB_READ_WRITE_TOKEN` name. If your Blob store uses Vercel OIDC instead of a long-lived token, the SDK can use that Vercel-provided authentication. Uploaded images are public because they are intended to be displayed in the gallery. The API only issues upload tokens to an administrator, and limits uploads to JPEG, PNG, WebP, or AVIF images up to 8 MB.

The browser upload is direct to Blob rather than sending the image through a Vercel Function request. The admin page loads the Blob client module from `esm.sh` at version 2.9.0; the first upload therefore needs an internet connection to load that module.

## Current limits of this milestone

- The current `schema.sql` already includes `artists.user_id` (unique) and `artworks.created_by`. Approving an application now links the user to one unassigned artist profile in `artists.user_id`; rejecting leaves the profile unassigned. Admins can unlink an account, which returns it to viewer status. Verified-artist self-service profile/artwork APIs and their page are the next implementation stage.
- Comments, ratings, and the international visitor dashboard are not included yet.
- Deleting a gallery record does not delete the associated Blob file. The file is intentionally retained so a shared/reused image is not accidentally deleted; unused files can be cleaned up separately.
- The new endpoints have been syntax-checked and their guards/validation have local smoke tests, but they have not been connected to your live TiDB or Vercel Blob store from this patch environment. Test on a preview deployment before making it your presentation version.