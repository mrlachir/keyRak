# Admin users and private identity documents

## User interface

Open `/admin/users` and select an account (the name button is keyboard accessible). The dialog loads
current account data and shows the avatar, name, email, database user ID, phone, and creation date.
Choose Client or Administrator, then **Save role**. Granting Administrator grants access to private IDs,
accounts, properties, and reservations; the UI explains this before saving.

The **View private document** control appears when an ID is on file. It is also available in the existing
booking-details dialog. Images display in the dialog; PDFs have an embedded preview and a download link.
Unsupported browser image formats have a download fallback. Missing files, expired/unauthorized access,
and upstream failures display **Document not available**, without exposing backend error messages.

## Endpoint contract

| Spring Boot endpoint | Purpose |
| --- | --- |
| `GET /api/admin/users` | Registered users; includes `avatarUrl` and `hasIdCard`, never an ID storage path |
| `GET /api/admin/users/{uuid}` | Current account details for the modal |
| `PATCH /api/admin/users/{uuid}/role` | JSON `{ "role": "ADMIN" }` or `{ "role": "CLIENT" }` |
| `DELETE /api/admin/users/{uuid}` | Permanent removal when deletion safeguards allow; returns 204 |
| `GET /api/admin/users/{uuid}/id-card` | Admin-only private image/PDF with no-store headers |

These endpoints require a valid Bearer JWT and a current database ADMIN role. Unauthenticated requests
receive 401, nonadmins 403, unknown accounts/documents 404, invalid roles 400, and blocked deletions 409.

The browser requests the matching Next.js `/api/admin/users/{uuid}/id-card` route with its same-origin
session cookie. That route uses the shared `apiFetchResponse` transport to forward the NextAuth access
token to Spring Boot. It streams only an allowed image/PDF response with private/no-store headers and
maps unsuccessful reads to a generic 404. No token, private storage filename, or absolute private URL is
put in the image source or query string. The client displays a temporary object URL and revokes it on
hide/unmount; it never sends IDs through the public image optimizer.

Do **not** make `/uploads/id-cards/**` public. There is deliberately no static resource mapping for it,
even for logged-in users. Files are selected from the target user's saved path, after admin authorization;
traversal, unexpected extensions, missing files, and symlinks are rejected.

## Deletion and role safeguards

- The UI requires typing the target's email before permanent removal. The action rechecks this against
  the backend profile before sending DELETE. Backend authorization is independently enforced.
- Admins cannot remove themselves or change their own role. Admin-account mutations lock the current
  administrator rows and target profile to preserve at least one administrator.
- Accounts with **any booking history** cannot be deleted (409). This intentionally preserves reservations
  and financial records instead of silently cascading deletion into them. If deletion of such accounts is
  required, design an explicit retention/anonymization policy before changing this guard.
- For eligible accounts, profile, reviews, wishlist entries, and notifications are deleted transactionally.
  The private ID file is removed only after commit. Property listings and their public media are not deleted.
- Backend request permissions are reconstructed from the current database role, not a stale JWT role claim.
  A demoted user loses backend admin access on subsequent requests. The navigation's NextAuth role display
  can remain cached until token refresh or a fresh sign-in; it is not the authorization boundary.
- A minimal `account_session_revocations` table keeps only a SHA-256 Google-subject fingerprint and deletion
  cutoff. Old sessions, including refreshed access tokens, cannot auto-recreate a removed account.
  `auth_time` is the original Google login time preserved through NextAuth refreshes. A genuinely new Google
  sign-in may create a new CLIENT account: permanent profile removal is not an account ban.

## Files

- UI: `frontend/components/admin/user-management-modal.tsx`, `user-management-table.tsx`, `secure-id-card.tsx`
- API actions: `frontend/app/actions/users.ts`
- Private proxy: `frontend/app/api/admin/users/[id]/id-card/route.ts`
- Backend: `AdminController`, `AdminUserService`, `BookingDocumentStorageService`
- Permissions/session revocation: `JwtUserSynchronizationFilter`, `UserService`, `AccountSessionRevocation`

## Deployment and verification

Deploy **both** frontend and backend. The existing `ddl-auto=update` configuration creates the revocation
table; environments using reviewed migrations should create it before releasing the backend. Keep
`BACKEND_API_URL` and the shared JWT configuration correct on Vercel/Render. No new secrets are required.
No production users were removed and no production roles were changed while implementing/testing this work.
Lost local ID files still require re-upload; authentication cannot restore a file erased from local storage.

Regression checks: `backend/mvnw test`; in `frontend`, `npm test`, `npm run lint`, `npm run typecheck`,
and `npm run build`. Tests use a local in-memory database and synthetic documents/accounts.
