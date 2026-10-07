# WP/MT/MEEGAHATHANNA PRIMARY COLLEGE

A complete school website built from the supplied React/Vite starter, with a maroon frontend, a Node.js API, a persistent SQLite database and a protected school staff portal.

**Start with [START_HERE.md](START_HERE.md) for the Sinhala setup guide.**

## Run locally

Install **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/), extract this project, and open a terminal inside this folder.

```bash
npm ci
npm run setup
npm run dev
```

Open **http://localhost:5173**. Use **http://localhost:5173/login** for staff sign-in.

`npm run setup` creates `.env`, initialises the database and asks you to create your own administrator. The password prompt is hidden. Use at least 12 characters including letters and numbers. There is **no default administrator password** and no account credential embedded in the project.

The same commands work in Windows PowerShell, macOS Terminal and Linux. An internet connection is needed to install packages; the website's default assets work without external image or font services.

## What is included

| Area                  | Functionality                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public website        | Home, About, Grades 1–5, Teachers, Events, Gallery, Contact, Admissions, Notice Board, Resources, Privacy and a 404 page                                                                         |
| Branding              | Maroon theme, responsive navigation, school name in English and Sinhala, editable school details, local illustration and a replaceable crest                                                     |
| Notices and events    | Database-backed lists and details, categories, search, pagination, pinned notices, upcoming/past events                                                                                          |
| Teachers and classes  | Editable teacher profiles and class information, photo uploads, public visibility controls                                                                                                       |
| Gallery and resources | Image uploads and lightbox, consent confirmation, downloadable PDFs and HTTPS resource links                                                                                                     |
| Enquiries             | Contact messages and admissions enquiries persist in the database and return reference numbers                                                                                                   |
| Staff dashboard       | Real content counts, private enquiry inboxes, status updates, internal notes, content CRUD and draft/publish controls                                                                            |
| Accounts              | Administrator and content editor roles, staff account creation/disable, login/logout and password changes                                                                                        |
| Security              | scrypt password hashes, hashed opaque session tokens, HttpOnly cookies, production Secure cookies, CSRF tokens, origin checks, rate limits, server validation, prepared SQL and security headers |
| Uploads               | Size/type restrictions, raster decoding/re-encoding, image resizing, EXIF/GPS removal, random file names, private drafts, PDF attachment downloads                                               |
| Maintenance           | Version-protected content updates, audit log, database backup, local password recovery and session revocation scripts                                                                            |
| Verification          | HTTP/security tests, browser smoke tests, TypeScript checking, ESLint and production build                                                                                                       |

## Database and first-use content

SQLite runs through Node.js 24's built-in `node:sqlite` module. You do not need Supabase, MySQL, an API key or a separate database server for this version.

- Database: `data/school.db`
- Uploaded images and PDFs: `data/uploads/`
- Schema: [database/schema.sql](database/schema.sql)
- Source staff roster: [database/teacher-roster.json](database/teacher-roster.json)

The database is created automatically. It initially contains five general class descriptions, three introductory website notices, and **29 teacher drafts** transcribed from the supplied 2026 staff sheet. Every teacher draft requires checking before publication. Signatures and the original staff-sheet photograph are not published or copied into the website.

The starter's fictional phone number, email, principal, school history, student counts, staff identities and future event dates have been removed. Contact details and principal information are blank until the administrator enters confirmed details. The generic welcome text, mission, vision, illustration and crest can be replaced with school-approved content.

## Make it your school

1. Sign in with the administrator account you created.
2. Open **School settings** to enter the phone number, email, office hours, confirmed address, school history and principal's message.
3. Upload the official school logo and an approved school photograph if available.
4. Open **Teachers**, check each imported name, set its role/grade, and tick the confirmation before choosing **Published**.
5. Add confirmed notices, events, resources and approved gallery photos. Drafts are visible to staff only.
6. Add staff accounts with the minimum permissions they need.
7. Review Contact messages and Admissions enquiries from the school-office sections.

Public visitors and parents do not need an account. This is a school information website and staff content-management system; it does not include student marks, attendance or a parent learning portal.

## Built local version

```bash
npm run build
npm start
```

Open **http://localhost:3001**. `npm start` switches the default development origin to the local built website port. Production keeps the HTTPS origin you explicitly configure.

`npm run preview` is a frontend-only Vite preview; use `npm start` for the complete built application with its API.

## Useful commands

```bash
npm test
npm run lint
npm run build
npm run format:check
npm run db:backup
npm run admin:reset-password
npm run db:clear-sessions
```

Browser tests use a fresh temporary database:

```bash
npx playwright install chromium
npm run test:ui
```

They save screenshots to `test-results/`. Browser installation needs network access and, on some Linux systems, system dependencies (`npx playwright install --with-deps chromium`).

## Further documentation

- [START_HERE.md](START_HERE.md): Sinhala setup and first-use instructions
- [docs/API.md](docs/API.md): endpoints and request formats
- [docs/SECURITY.md](docs/SECURITY.md): implemented protections and role rules
- [docs/OPERATIONS.md](docs/OPERATIONS.md): HTTPS deployment, backups and recovery
- [docs/VERIFICATION.md](docs/VERIFICATION.md): checks performed on this release

The ZIP intentionally excludes `node_modules`, `.env`, accounts, live databases, private uploads, backups and test databases. Keep `package-lock.json`; `npm ci` installs the tested dependency versions.
