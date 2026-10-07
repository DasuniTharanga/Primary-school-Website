# Verification record

Verified on 7 October 2026 using Node.js 24.19.0.

| Check                            | Result                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| Automated API and database tests | 31 tests passed; no failures or skipped tests                                          |
| TypeScript and production build  | Passed                                                                                 |
| ESLint                           | Passed with no errors or warnings                                                      |
| Prettier                         | Passed                                                                                 |
| Dependency audit                 | No known vulnerabilities reported by npm audit on the verification date                |
| Browser checks                   | Passed in headless Chromium 141 at desktop (1440 × 1000) and mobile (390 × 844) widths |
| Interactive first-time setup     | Passed using a temporary database and an administrator account created for testing     |
| Database and upload backup       | Passed using the temporary test database                                               |

Local staff password recovery was also verified: the new password was accepted, the old password was rejected, sessions were cleared, and the database integrity check passed.

The browser checks cover all 12 public pages, administration pages, responsive navigation, real contact and admission submissions, login and logout, notice creation/publication/deletion, teacher publication, image upload and gallery lightbox, private inbox updates, and editor access restrictions. No JavaScript errors, Content Security Policy violations, broken images, or horizontal page overflow were observed during these checks.

API tests cover authentication and session expiry, password hashing, administrator/editor permissions, CSRF and origin enforcement, rate limiting, validation, draft visibility, concurrent edit conflicts, media validation and metadata removal, enquiry persistence, audit records, database restart persistence, and restrictions on serving private files.

The ZIP includes source code and the production frontend build. It excludes dependencies, local environment secrets, databases, uploaded school documents, temporary test accounts, and test results. The administrator is created during `npm run setup`; there are no default login credentials.

The screenshots in `screenshots/` show the tested interface. The administration screenshot contains temporary demonstration accounts and enquiries, not actual pupil data.

## Items to complete before public launch

- Enter the school's confirmed telephone number, email address, opening hours, and principal details through Settings.
- Review the 29 draft teacher profiles against the original roster, correct any names or initials, and confirm each profile before publication.
- Replace the generic crest and illustration with school-approved assets if available. Publish gallery photographs only with the required permission.
- Configure the final HTTPS origin and persistent database/upload storage, following `OPERATIONS.md`.
- Keep regular backups and use the least privileged staff role needed.

Docker configuration is included but was not executed because Docker was unavailable in the verification environment. A live production deployment, domain, TLS certificate, outgoing email service, and school data entry were not part of these local checks. Contact and admission enquiries are stored in the private dashboard; sending email is not automatic. These checks provide implementation evidence and do not constitute an independent penetration test.
