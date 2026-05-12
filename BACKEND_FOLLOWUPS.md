# Backend Follow-ups

> Items the frontend team needs from the backend team after aligning the SPA
> with `FRONTEND_CHANGES.md`. Subagents implementing each domain should append
> findings under the section that matches their scope. Use the template:
>
> ```
> ### <short title>
> **Found by:** Agent-X (file: src/path/to/file.js)
> **Severity:** blocker | major | minor | question
> **Detail:** what is wrong, what would unblock the frontend.
> ```

---

## A — Security (forgot-password / create-reset-token / uploads)

### Confirm reports upload allowlist matches announcements allowlist
**Found by:** Agent-D (file: src/components/Reports/Reports.js)
**Severity:** question
**Detail:** Frontend now sends reports with this extension+MIME allowlist:
  - Documents: `.pdf, .doc, .docx, .txt, .xls, .xlsx, .ppt, .pptx`
  - Images: `.jpg, .jpeg, .png`

Previously the reports UI only accepted `.pdf,.doc,.docx,.jpg,.jpeg,.png`. The expansion to spreadsheets/presentations/text mirrors `ALLOWED_DOCUMENT_TYPES` (the backend doc allowlist per A.3) plus a curated image subset. Please confirm:
  1. `POST /api/reports` and `PUT /api/reports/{id}` actually accept all eight document MIMEs (not just PDF/DOC/DOCX) — the reports endpoint may historically have had a narrower allowlist than the announcements endpoint.
  2. The 25MB max upload size is still enforced server-side for reports (frontend rejects > 25MB pre-upload; we'd like the server to remain authoritative).
  3. Images on reports (`image/jpeg`, `image/png`) pass the same extension+MIME AND check as documents — i.e. the reports controller does not call a `isValidDocument`-only validator that would reject all images.

### Confirm reset-token endpoints still exist with query-param signatures
**Found by:** Agent-A (file: src/components/ForgotPassword/ResetPassword.js)
**Severity:** question
**Detail:** `ResetPassword.js` still calls:
  - `GET  /api/users/validate-reset-token?token=<jwt>` (expects 200 valid, 404 invalid, 410 expired)
  - `POST /api/users/reset-password?token=<jwt>&newPassword=<pwd>` (token + newPassword as **query params**, not JSON body)

`FRONTEND_CHANGES.md` A.1/A.2 only mention `create-reset-token` and `forgot-password`. Please confirm these two endpoints still exist with the **exact** paths and **query-param** signatures shown above, and that the 404/410 status semantics for `validate-reset-token` are still correct. Sending a new password as a query string is also worth flagging from a security standpoint — consider moving `newPassword` to the JSON body.

### Confirm `requestPasswordReset` callers can ignore the response body
**Found by:** Agent-A (file: src/components/ForgotPassword/ForgotPassword.js)
**Severity:** minor
**Detail:** After A.2 the frontend no longer reads `response.message`, `response.token`, or `response.success` from `POST /api/users/forgot-password`. We show a fixed Spanish message on any 2xx. If the backend ever needs the frontend to surface a backend-localized message verbatim, let us know and we'll switch back to rendering `response.message`.

---

## B — Tech debt & data integrity

- **Dev seed credentials change.** Frontend devs running with `app.database.repopulate=true` must update local Postman/login bookmarks to:
  - Admin: `admin1@harmos.example.com` / `dev-password-change-me`
  - Superuser: `superuser@harmos.example.com` / `dev-password-change-me`
  - Doctors: `doctor1..30@harmos.example.com` / `dev-password-change-me`
- **Lazy fetch on `Patient.doctors` and `AppUser.roles`.** Confirm controllers return DTOs that already project the needed fields (frontend reads `patient.doctors[].specialty/name`). If a `LazyInitializationException` ever surfaces in prod, the controller is serializing the entity outside the transaction.

---

## C — Authorization & exception handling

### Confirm `createdByUserId` is always present on paged list responses
**Found by:** Agent-B (file: `src/components/AnnouncementBoard/AnnouncementBoard.js`)
**Severity:** question
**Detail:** The owner-or-admin gating (`canModify`) relies on `announcement.createdByUserId` being present on every item returned from `GET /api/announcements?page=...`. If a list-projection DTO ever omits this field, the owner check silently fails and only admins see edit/delete. Please confirm the paged list response includes `createdByUserId` on each item (matching the single-fetch `GET /api/announcements/{id}` shape).

### `POST /api/announcements/{id}/files` response shape
**Found by:** Agent-B (file: `src/components/AnnouncementBoard/AnnouncementBoard.js`)
**Severity:** question
**Detail:** Frontend reads `{ images, files, uploaded, errors }` from this endpoint after uploading. Need confirmation that:
  1. Per-file rejections (extension+MIME mismatch now enforced as AND) are surfaced via the `errors[]` array rather than failing the whole request with `400`.
  2. The endpoint participates in the global exception handler envelope (`{error}` / `{errors:{...}}`) for non-2xx responses, so `parseApiError` works uniformly.

---

## D — Reports sortBy / sortDirection

### Reports list now sends user-controlled `sortBy` / `sortDirection`
**Found by:** Agent-D (file: src/components/Reports/Reports.js)
**Severity:** minor
**Detail:** Reports.js previously hardcoded `sortBy=date&sortDirection=desc`. The list page now exposes two dropdowns ("Ordenar por": `date|title|id`, "Dirección": `desc|asc`) wired through to `GET /api/reports/all`. Defaults are still `date/desc` so behaviour is unchanged unless the user interacts. Please confirm:
  1. The whitelist on the backend matches frontend options (`id`, `title`, `date` for `sortBy`; `asc`, `desc` for `sortDirection`). Any out-of-list value should fall back to `date desc` per the spec.
  2. Sorting by `title` is case-insensitive and locale-aware (Spanish accents) — otherwise the visible order may surprise users.

---

## E — Validation & entity completeness

### Reports POST/PUT: expected `fieldErrors` keys for `title`, `patientId`, `specialtyId`
**Found by:** Agent-D (file: src/components/Reports/Reports.js)
**Severity:** question
**Detail:** Reports.js now consumes `{ errors: { fieldName: msg } }` from `POST /api/reports` and `PUT /api/reports/{id}` and maps them inline to the matching form controls. The keys it understands are `title`, `patientId`, `specialtyId` (plus `doctorId` defensively). Per `FRONTEND_CHANGES.md` §E note, reports use multipart `@RequestParam` rather than a `@Valid` DTO, so any inline validation messages must be raised manually by the controller. Please confirm the controller raises field-keyed validation errors (e.g. `{"errors":{"title":"..."}}`) for invalid inputs rather than a generic `{"error":"..."}` envelope, otherwise the inline-mapping path is dead code and all errors fall through to the top-of-form banner.

### Reports `createdAt` / `updatedAt` exposed but not displayed
**Found by:** Agent-D (file: src/components/Reports/Reports.js)
**Severity:** minor
**Detail:** Per §E, `Report` responses now include `createdAt` and `updatedAt`. The current Reports table keeps a single "Fecha" column bound to `report.date` and does not yet surface the new audit fields. Additive on the backend — no action needed unless product asks for them in the UI.

### Announcement validation: only `title` and `content` field keys mapped on the frontend
**Found by:** Agent-B (file: `src/components/AnnouncementBoard/AnnouncementBoard.js`)
**Severity:** minor
**Detail:** Per `FRONTEND_CHANGES.md` §E, `POST /announcements` validates `title` (NotBlank, max 255) and `content` (NotBlank); `PUT /announcements/{id}` validates `title` only. Frontend currently maps `fieldErrors.title` → `titleError` and `fieldErrors.content` → `contentError`; any other field key returned by the backend will fall through to the generic `formError` banner. Please notify the frontend if additional validated fields are added (e.g. `specialties`) so the per-field mapping can be extended.

---

## Cross-cutting

_No items yet._
