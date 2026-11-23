# Verified Artist Portal patch

This milestone adds a self-service studio for accounts that have been approved by an administrator.

## Files

Copy `artist.html`, `artist.css`, `artist.js`, `api/artist/profile.js`, and `api/artist/artworks.js` into the matching locations in the existing project. Replace `auth.js` with this patch version so verified artists see the Artist Studio navigation link. Replace `api/admin/upload.js` with this version so verified artists can request upload tokens for files in their own artist-ID-prefixed folders; administrator uploads continue to work.

No database migration or new package dependency is required. The existing `artists.user_id` and `artworks.created_by` columns are used.

## Security model

- Both artist APIs check the signed-in account's `role = artist` and `artist_status = verified` on the server.
- The server looks up the artist profile through `artists.user_id`; the browser cannot select an owner profile.
- Artwork reads, updates, and deletes are always constrained by that server-derived `artist_id`.
- Artist artwork creation always uses the server-derived artist ID and stores the signed-in user in `created_by`.
- Artists cannot set hero slideshow positions. Those remain admin-controlled.
- The upload handler checks the verified account's linked artist ID and permits only filenames prefixed with that ID. Existing admin uploads remain available.

## Test on a Vercel Preview deployment

1. Make a backup or commit your current project first.
2. Merge the files listed above; do not replace the whole project folder.
3. Run `npm install` (no dependency change is expected, but this confirms the lockfile/install state).
4. Deploy a Preview build.
5. Sign in with a verified artist account and confirm the Artist Studio link appears.
6. Edit the profile, add an artwork, edit it, and delete a test artwork.
7. Sign in as a viewer and confirm the artist page and artist APIs deny access.
8. Try requesting an artwork belonging to a different artist by changing its ID in the request; the API must return 404 and leave the other record unchanged.
9. Test portrait and artwork uploads. Confirm the resulting URLs display in the gallery.
10. Re-test Admin Studio uploads and CRUD to ensure the shared upload endpoint still works for administrators.

This patch has local syntax checks only. It has not been tested against the live TiDB database or Vercel Blob store. Keep the Preview deployment until these checks pass.