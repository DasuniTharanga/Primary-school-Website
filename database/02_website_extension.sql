/* =====================================================================
   WP/MT Meegahathenna PRIMARY SCHOOL - WEBSITE EXTENSION
   Run AFTER 01_school_database.sql (npm run db:setup does both).
   Adds the tables the website needs on top of your original design:
     sessions, news, gallery, admission enquiries, contact messages,
     site settings, rate limiting.
   Your original 15 tables are NOT removed or renamed.
   ===================================================================== */
USE WP_MT_Meegahathenna_primary_school;

-- Original password column was CHAR(64) (SHA-256 only). The website upgrades
-- hashes to scrypt on first successful login, which is longer than 64 chars.
ALTER TABLE user_account MODIFY password_hash VARCHAR(255) NOT NULL;
ALTER TABLE user_account ADD COLUMN display_name VARCHAR(100) NULL;
UPDATE user_account SET display_name = 'School Administrator' WHERE role = 'Admin' AND display_name IS NULL;

-- Login sessions (token is stored only as a SHA-256 hash)
CREATE TABLE web_session (
    token_hash  CHAR(64) PRIMARY KEY,
    user_id     INT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_account(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_session_user ON web_session(user_id);

-- Brute-force protection for login and public forms
CREATE TABLE rate_limit (
    key_name  VARCHAR(120) PRIMARY KEY,
    hits      INT NOT NULL,
    reset_at  BIGINT NOT NULL
) ENGINE=InnoDB;

-- News & announcements (News page + dashboards)
CREATE TABLE news (
    news_id       INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(150) NOT NULL,
    category      VARCHAR(40)  NOT NULL DEFAULT 'General',
    summary       VARCHAR(300) NOT NULL,
    body          TEXT,
    published_on  DATE NOT NULL,
    is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
    is_published  BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    INT NULL,
    FOREIGN KEY (created_by) REFERENCES user_account(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX idx_news_date ON news(published_on);

-- Gallery photos (image_path is a URL such as /gallery/photo.jpg)
CREATE TABLE gallery_item (
    gallery_id    INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(120) NOT NULL,
    category      VARCHAR(40)  NOT NULL DEFAULT 'School life',
    image_path    VARCHAR(255) NOT NULL,
    taken_on      DATE NULL,
    is_published  BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- Online admission enquiries (an enquiry is NOT an approval)
CREATE TABLE admission_enquiry (
    enquiry_id     INT AUTO_INCREMENT PRIMARY KEY,
    reference      VARCHAR(20) NOT NULL UNIQUE,
    parent_name    VARCHAR(100) NOT NULL,
    parent_email   VARCHAR(100) NOT NULL,
    phone          VARCHAR(20)  NOT NULL,
    child_name     VARCHAR(100) NOT NULL,
    date_of_birth  DATE NOT NULL,
    grade_id       INT NOT NULL,
    address        VARCHAR(255) NOT NULL,
    message        TEXT,
    status         ENUM('New','Contacted','Closed') NOT NULL DEFAULT 'New',
    internal_notes TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grade_id) REFERENCES grade(grade_id)
) ENGINE=InnoDB;

-- Contact form messages
CREATE TABLE contact_message (
    message_id  INT AUTO_INCREMENT PRIMARY KEY,
    reference   VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    subject     VARCHAR(150) NOT NULL,
    message     TEXT NOT NULL,
    status      ENUM('New','Read','Resolved') NOT NULL DEFAULT 'New',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Editable school details (shown on Contact page and footer)
CREATE TABLE site_setting (
    setting_key    VARCHAR(40) PRIMARY KEY,
    setting_value  VARCHAR(500) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

INSERT INTO site_setting (setting_key, setting_value) VALUES
('school_name',   'WP/MT/Meegahathanna Primary College'),
('school_name_si','මීගහතැන්න ප්‍රාථමික විද්‍යාලය'),
('tagline',       'Small steps. Bright futures.'),
('address',       'Meegahathanna, Sri Lanka'),
('phone',         ''),
('email',         ''),
('office_hours',  'Monday to Friday, 7:30 AM - 1:30 PM'),
('principal',     ''),
('admissions_open','1');

-- Sample news. Replace with the school's real announcements from the Admin dashboard.
INSERT INTO news (title, category, summary, body, published_on, is_pinned) VALUES
('Annual Sports Meet registrations open', 'Sports',
 'Class teachers are collecting names for track events, relay races and team games.',
 'The Annual Sports Meet takes place on 18 October at the school sports ground. Parents are invited to cheer on the children. Please speak to your class teacher about event registration.',
 '2026-10-05', TRUE),
('Children''s Day celebration programme', 'Celebration',
 'Games, performances and treats are planned for all students in the main hall.',
 'Our Children''s Day celebration will be held in the school main hall on 25 October. Students may take part in performances arranged by their class teachers.',
 '2026-10-03', FALSE),
('Art Exhibition: calling all young artists', 'Arts',
 'Grade 1 to 5 paintings, sculptures and crafts will be displayed in the Art Gallery.',
 'Students who would like to display their work should hand it to the art teacher before the exhibition on 8 November.',
 '2026-09-28', FALSE);

INSERT INTO gallery_item (title, category, image_path, taken_on) VALUES
('Our school entrance',        'Campus',      '/gallery/school-entrance.jpg', NULL),
('Children''s Day assembly',   'Celebration', '/gallery/childrens-day.jpg',   NULL),
('Our students',               'School life', '/gallery/students.jpg',        NULL);
