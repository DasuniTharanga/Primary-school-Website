# API reference

All API responses use JSON. Errors use `{ "error": "Readable message" }` with an appropriate HTTP status. API responses are not cached. Pagination uses `page` (default 1) and `limit` (default 12, maximum 100).

## Request rules

Every POST/PATCH/DELETE must include:

```http
Content-Type: application/json
Origin: <exact APP_ORIGIN>
X-School-Request: 1
```

Authenticated mutations also need the session cookie and `X-CSRF-Token` returned by login or the session endpoint. The browser client handles these automatically. No cross-origin CORS access is enabled.

## Public endpoints

| Method | Endpoint                 | Response / purpose                                                  |
| ------ | ------------------------ | ------------------------------------------------------------------- |
| GET    | `/api/health`            | `{status:"ok"}`                                                     |
| GET    | `/api/site`              | Public school settings and published-content counts                 |
| GET    | `/api/content/:kind`     | Published records with search, category and pagination              |
| GET    | `/api/content/:kind/:id` | A published record; drafts return 404                               |
| POST   | `/api/contact`           | Saves a message; returns 201 and a reference                        |
| POST   | `/api/admissions`        | Saves an enquiry; returns 201 and a reference                       |
| GET    | `/media/:generated-file` | Published media; draft/unlinked media requires staff authentication |
| GET    | `/sitemap.xml`           | Public routes and published notice/event details                    |

Content kinds: `notices`, `events`, `teachers`, `classes`, `gallery`, `resources`.

List result:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 12,
  "pages": 0,
  "categories": []
}
```

Event lists accept `period=upcoming`, `period=past` or `period=all`. Dates and times are intended for Sri Lanka; the upcoming/past boundary uses `Asia/Colombo`.

Contact payload:

```json
{
  "name": "Parent or guardian name",
  "email": "parent@example.com",
  "phone": "0771234567",
  "subject": "General enquiry",
  "message": "Please share the school office visiting arrangements.",
  "consent": true,
  "website": ""
}
```

Admissions payload:

```json
{
  "parentName": "Guardian name",
  "parentEmail": "parent@example.com",
  "phone": "0771234567",
  "childName": "Child name",
  "dateOfBirth": "2020-05-20",
  "grade": 1,
  "address": "Home address",
  "message": "An optional question",
  "consent": true,
  "website": ""
}
```

`website` is a honeypot and must be empty. Form consent is required. The date of birth must be a real date in the past within 20 years; this validates the enquiry input and does not decide official admissions eligibility. When school settings close admissions enquiries, the endpoint returns 403.

## Authentication

| Method | Endpoint             | Purpose                                                                                  |
| ------ | -------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`    | `{email,password}`; sets HttpOnly session cookie; returns restricted user and CSRF token |
| GET    | `/api/auth/session`  | Returns current user/CSRF token, or `{user:null,csrfToken:""}`                           |
| POST   | `/api/auth/logout`   | Revokes current session and clears cookie                                                |
| POST   | `/api/auth/password` | `{currentPassword,newPassword}`; rotates password and revokes all account sessions       |

There is no public account signup or role selection. Accounts are provisioned by an administrator or initial local setup. Recovery is a local server script.

## Staff content endpoints — ADMIN and EDITOR

| Method | Endpoint                       | Purpose                                                            |
| ------ | ------------------------------ | ------------------------------------------------------------------ |
| GET    | `/api/admin/dashboard`         | Content counts/recent changes; private inbox counts for ADMIN only |
| GET    | `/api/admin/content/:kind`     | All records, with `search`, `status`, `category`, `page`, `limit`  |
| GET    | `/api/admin/content/:kind/:id` | One record, including drafts                                       |
| POST   | `/api/admin/content/:kind`     | Create a record                                                    |
| PATCH  | `/api/admin/content/:kind/:id` | Replace editable fields using current `version`                    |
| DELETE | `/api/admin/content/:kind/:id` | Delete using `{version}`                                           |
| POST   | `/api/admin/media`             | `{fileName,base64}`; returns `{path,name,mimeType,size}`           |

Common content fields:

```json
{
  "title": "School notice title",
  "summary": "A short description",
  "body": "Plain-text details with paragraphs",
  "category": "School news",
  "status": "draft",
  "imagePath": "",
  "data": { "pinned": false },
  "sortOrder": 0,
  "version": 1
}
```

For new records omit `version`. Unknown data fields are not persisted. Text is rendered as plain text, not HTML.

| Kind      | Allowed `data` fields                                |
| --------- | ---------------------------------------------------- |
| notices   | `pinned:boolean`                                     |
| events    | `date:YYYY-MM-DD`, `time:HH:mm`, `location:string`   |
| teachers  | `role`, `grade`, `subject`, `reviewRequired:boolean` |
| classes   | `grade:1–5`, `sections`, `subjects`                  |
| gallery   | `alt`, `consentConfirmed:boolean`                    |
| resources | `filePath`, `link:https-url`, `grade`                |

Images must be registered uploaded image paths. PDFs must be registered PDF paths. Teachers with `reviewRequired:true` and gallery images without permission confirmation cannot be published. Updates/deletes using a stale version return 409.

## Administrator-only endpoints

| Method    | Endpoint                                               | Purpose                                                        |
| --------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| GET/PATCH | `/api/admin/settings`                                  | Read/update complete school settings using `version`           |
| GET       | `/api/admin/messages`                                  | Private messages with status/search/pagination                 |
| GET       | `/api/admin/admissions`                                | Private admissions enquiries with status/search/pagination     |
| GET       | `/api/admin/messages/:id`, `/api/admin/admissions/:id` | One private enquiry                                            |
| PATCH     | the enquiry endpoints above                            | `{status,internalNotes,version}`                               |
| DELETE    | the enquiry endpoints above                            | `{version}`; removes personal details                          |
| GET       | `/api/admin/users`                                     | Restricted staff account list                                  |
| POST      | `/api/admin/users`                                     | `{name,email,password,role}` where role is ADMIN or EDITOR     |
| PATCH     | `/api/admin/users/:id`                                 | `{name,role,active}`; email is immutable through this endpoint |
| GET       | `/api/admin/audit`                                     | Paginated staff activity log                                   |

Message states: `NEW`, `READ`, `RESOLVED`. Admissions states: `NEW`, `CONTACTED`, `CLOSED`. Notes are internal and do not send email. Account disabling and permission changes revoke existing sessions. The current administrator cannot disable/demote their own account, and at least one active administrator must remain.

## Status codes

200 success; 201 creation; 400 invalid input; 401 sign-in required/incorrect credentials; 403 forbidden role/origin/CSRF; 404 missing/private record; 409 stale version/duplicate; 413 request too large; 415 unsupported content type; 429 attempt limit; 500 generic server error.
