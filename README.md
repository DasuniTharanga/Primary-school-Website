# Meegahathanna Primary College – School Management System

React + Node.js website and portal backed by **MySQL** (your `WP_MT_Meegahathenna_primary_school` database),
styled after the indigo Figma template (Home, About, Classes, Teachers, Events, Gallery, News, Admissions,
Contact, Login, Parent / Teacher / Admin dashboards).

## Run it (5 steps)
1. Install **Node.js 20+** and **MySQL 8**. Make sure MySQL is running.
2. In this folder: `npm install`
3. Copy `.env.example` to `.env` and set `DB_PASSWORD` (your MySQL root password).
4. `npm run db:setup` – creates the database from `database/01_school_database.sql` (your file) and adds the
   website tables from `database/02_website_extension.sql`. **It drops and recreates the database**, so run it only on a fresh setup.
   (Alternative: import both files in MySQL Workbench, in order.)
5. `npm run dev` → open **http://localhost:5173**

Demo logins (from your SQL file): `admin@abcprimary.edu / Admin@123`, `sarah@abcprimary.edu / Pass@123`,
`nimal.p@mail.com / Pass@123`. Change these before going live (Admin → Accounts → Password).

## Production
`npm run build` then `npm start` (serves the site + API on port 3001). Set `NODE_ENV=production` and an HTTPS `APP_ORIGIN` in `.env`.

## What is connected to which table
| Page / feature | Tables |
|---|---|
| Classes, Teachers | grade, class_section, teacher, teaching_assignment, subject, enrollment |
| Events | school_event |
| News, Gallery, Admissions, Contact, Settings | news, gallery_item, admission_enquiry, contact_message, site_setting (new) |
| Login | user_account + web_session (new). SHA-256 hashes from your SQL are upgraded to scrypt on first login |
| Parent dashboard | guardian, student_guardian, student, attendance, result, exam |
| Teacher dashboard | class_section, enrollment, attendance, result, teaching_assignment |
| Admin dashboard | everything above; students/teachers CRUD, accounts, class capacity trigger |

## Notes
- Your original SQL had `GRANT` statements for `abc_primary_school`; they now point to the real database name.
- Teachers mark attendance only for classes they are class teacher of, and enter marks only for subjects assigned to them (`teaching_assignment`).
- Photos: copy files into `public/gallery/` and add them under Admin → Gallery.
- Phone/email on the Contact page come from Admin → Settings (left blank until you fill them in).
- Sample news items and teacher/student data are demo content from your SQL file.
