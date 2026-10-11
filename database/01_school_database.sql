/* =====================================================================
   WP/MT Meegahathenna PRIMARY SCHOOL - DATABASE MANAGEMENT SYSTEM
   DBMS: MySQL 8.x
   Sections:
     1. Create database
     2. Tables (DDL)  - PKs, FKs, constraints
     3. Sample data (DML - INSERT)
     4. Views
     5. Useful queries (SELECT, JOIN, GROUP BY, subquery)
     6. Stored procedure + trigger
     7. Security (users and privileges)
     8. Backup / restore commands
   ===================================================================== */

-- ---------------------------------------------------------------------
-- 1. CREATE DATABASE
-- ---------------------------------------------------------------------
DROP DATABASE IF EXISTS WP_MT_Meegahathenna_primary_school;
CREATE DATABASE WP_MT_Meegahathenna_primary_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE WP_MT_Meegahathenna_primary_school;

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------

-- 2.1 Academic year (e.g. 2026)
CREATE TABLE academic_year (
    year_id     INT AUTO_INCREMENT PRIMARY KEY,
    year_name   VARCHAR(9) NOT NULL UNIQUE,          -- '2026'
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    CHECK (end_date > start_date)
) ENGINE=InnoDB;

-- 2.2 Grade (Grade 1 .. Grade 5)
CREATE TABLE grade (
    grade_id      INT AUTO_INCREMENT PRIMARY KEY,
    grade_name    VARCHAR(20) NOT NULL UNIQUE,
    description   VARCHAR(255)
) ENGINE=InnoDB;

-- 2.3 Teacher
CREATE TABLE teacher (
    teacher_id    INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    gender        ENUM('Male','Female') NOT NULL,
    phone         VARCHAR(15),
    email         VARCHAR(100) UNIQUE,
    qualification VARCHAR(100),
    experience_yrs TINYINT UNSIGNED DEFAULT 0,
    joined_date   DATE,
    status        ENUM('Active','Retired','Resigned') DEFAULT 'Active'
) ENGINE=InnoDB;

-- 2.4 Class section (e.g. Grade 1 - A) for a given year, with a class teacher
CREATE TABLE class_section (
    class_id         INT AUTO_INCREMENT PRIMARY KEY,
    grade_id         INT NOT NULL,
    year_id          INT NOT NULL,
    section_name     CHAR(1) NOT NULL,                -- 'A' or 'B'
    class_teacher_id INT NOT NULL,
    capacity         TINYINT UNSIGNED DEFAULT 35,
    UNIQUE (grade_id, year_id, section_name),
    UNIQUE (class_teacher_id, year_id),                -- one teacher = one class per year
    FOREIGN KEY (grade_id)         REFERENCES grade(grade_id),
    FOREIGN KEY (year_id)          REFERENCES academic_year(year_id),
    FOREIGN KEY (class_teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB;

-- 2.5 Subject
CREATE TABLE subject (
    subject_id    INT AUTO_INCREMENT PRIMARY KEY,
    subject_name  VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2.6 Student
CREATE TABLE student (
    student_id     INT AUTO_INCREMENT PRIMARY KEY,
    admission_no   VARCHAR(10) NOT NULL UNIQUE,
    full_name      VARCHAR(100) NOT NULL,
    gender         ENUM('Male','Female') NOT NULL,
    date_of_birth  DATE NOT NULL,
    address        VARCHAR(255),
    admitted_date  DATE NOT NULL,
    status         ENUM('Active','Transferred','Left') DEFAULT 'Active'
) ENGINE=InnoDB;

-- 2.7 Guardian (parent)
CREATE TABLE guardian (
    guardian_id   INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    nic           VARCHAR(12) UNIQUE,
    phone         VARCHAR(15) NOT NULL,
    email         VARCHAR(100),
    occupation    VARCHAR(80)
) ENGINE=InnoDB;

-- 2.8 Student <-> Guardian (many-to-many)
CREATE TABLE student_guardian (
    student_id    INT NOT NULL,
    guardian_id   INT NOT NULL,
    relationship  ENUM('Father','Mother','Guardian') NOT NULL,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (student_id, guardian_id),
    FOREIGN KEY (student_id)  REFERENCES student(student_id)   ON DELETE CASCADE,
    FOREIGN KEY (guardian_id) REFERENCES guardian(guardian_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2.9 Enrollment (which student is in which class in which year)
CREATE TABLE enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    class_id      INT NOT NULL,
    enrolled_on   DATE NOT NULL,
    UNIQUE (student_id, class_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id)       ON DELETE CASCADE,
    FOREIGN KEY (class_id)   REFERENCES class_section(class_id)
) ENGINE=InnoDB;

-- 2.10 Teaching assignment (which teacher teaches which subject to which class)
CREATE TABLE teaching_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id    INT NOT NULL,
    subject_id    INT NOT NULL,
    class_id      INT NOT NULL,
    UNIQUE (subject_id, class_id),                     -- one teacher per subject per class
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (class_id)   REFERENCES class_section(class_id)
) ENGINE=InnoDB;

-- 2.11 Attendance (one row per student per day)
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    att_date      DATE NOT NULL,
    status        ENUM('Present','Absent','Late') NOT NULL,
    remarks       VARCHAR(150),
    marked_by     INT NOT NULL,                        -- teacher who marked it
    UNIQUE (student_id, att_date),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by)  REFERENCES teacher(teacher_id)
) ENGINE=InnoDB;

-- 2.12 Exam (term test)
CREATE TABLE exam (
    exam_id     INT AUTO_INCREMENT PRIMARY KEY,
    exam_name   VARCHAR(60) NOT NULL,                  -- 'Term 1 Test'
    year_id     INT NOT NULL,
    term_no     TINYINT NOT NULL CHECK (term_no BETWEEN 1 AND 3),
    exam_date   DATE,
    UNIQUE (year_id, term_no),
    FOREIGN KEY (year_id) REFERENCES academic_year(year_id)
) ENGINE=InnoDB;

-- 2.13 Result (marks of a student for a subject in an exam)
CREATE TABLE result (
    result_id   INT AUTO_INCREMENT PRIMARY KEY,
    exam_id     INT NOT NULL,
    student_id  INT NOT NULL,
    subject_id  INT NOT NULL,
    marks       DECIMAL(5,2) NOT NULL CHECK (marks BETWEEN 0 AND 100),
    UNIQUE (exam_id, student_id, subject_id),
    FOREIGN KEY (exam_id)    REFERENCES exam(exam_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
) ENGINE=InnoDB;

-- 2.14 School event (shown on the website Events page)
CREATE TABLE school_event (
    event_id    INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    category    ENUM('Sports','Celebration','Arts','Educational','Ceremony') NOT NULL,
    event_date  DATE NOT NULL,
    event_time  TIME,
    location    VARCHAR(100),
    description TEXT,
    created_by  INT,                                   -- teacher who created it
    FOREIGN KEY (created_by) REFERENCES teacher(teacher_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2.15 User account (website login: parent / teacher / admin)
CREATE TABLE user_account (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL,                   -- SHA-256 hash, never plain text
    role          ENUM('Admin','Teacher','Parent') NOT NULL,
    teacher_id    INT NULL,
    guardian_id   INT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    DATETIME,
    FOREIGN KEY (teacher_id)  REFERENCES teacher(teacher_id)   ON DELETE CASCADE,
    FOREIGN KEY (guardian_id) REFERENCES guardian(guardian_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexes for faster searching
CREATE INDEX idx_student_name   ON student(full_name);
CREATE INDEX idx_attendance_dt  ON attendance(att_date);
CREATE INDEX idx_event_date     ON school_event(event_date);

-- ---------------------------------------------------------------------
-- 3. SAMPLE DATA
-- ---------------------------------------------------------------------
INSERT INTO academic_year (year_name, start_date, end_date) VALUES
('2026', '2026-01-05', '2026-12-18');

INSERT INTO grade (grade_name, description) VALUES
('Grade 1', 'Joyful introduction to school life'),
('Grade 2', 'Reading, writing and basic arithmetic'),
('Grade 3', 'Language, mathematics and science'),
('Grade 4', 'Analytical skills and creativity'),
('Grade 5', 'Scholarship and secondary school preparation');

INSERT INTO teacher (full_name, gender, phone, email, qualification, experience_yrs, joined_date) VALUES
('Mrs. Sarah Perera',        'Female','0771234501','sarah@abcprimary.edu',  'B.Ed',  12,'2014-02-01'),
('Mr. Rohan Silva',          'Male',  '0771234502','rohan@abcprimary.edu',  'B.Ed',   8,'2018-03-01'),
('Ms. Tharushi Fernando',    'Female','0771234503','tharushi@abcprimary.edu','BA, PGDE',6,'2020-01-15'),
('Mr. Kasun Jayawardena',    'Male',  '0771234504','kasun@abcprimary.edu',  'B.Sc, PGDE',10,'2016-06-01'),
('Mrs. Niluka Wijesinghe',   'Female','0771234505','niluka@abcprimary.edu', 'B.Ed',  15,'2011-01-10'),
('Mr. Dinesh Bandara',       'Male',  '0771234506','dinesh@abcprimary.edu', 'B.Ed',   9,'2017-05-20'),
('Ms. Amaya Rajapaksa',      'Female','0771234507','amaya@abcprimary.edu',  'BA (Fine Arts)',7,'2019-02-11'),
('Mr. Suresh Mendis',        'Male',  '0771234508','suresh@abcprimary.edu', 'Dip. in Sports',11,'2015-08-03');

INSERT INTO subject (subject_name) VALUES
('English Language'),('Mathematics'),('Environmental Studies'),
('Science'),('Sinhala / Tamil'),('Art & Craft'),('Physical Education');

-- Class sections 1A..5A (class teacher = the 8 teachers; kept to 8 classes for demo)
INSERT INTO class_section (grade_id, year_id, section_name, class_teacher_id) VALUES
(1,1,'A',1),(1,1,'B',2),(2,1,'A',3),(2,1,'B',4),
(3,1,'A',5),(3,1,'B',6),(4,1,'A',7),(5,1,'A',8);

INSERT INTO student (admission_no, full_name, gender, date_of_birth, address, admitted_date) VALUES
('ADM001','Kavindu Perera',   'Male',  '2019-03-14','Pita Kotte','2026-01-05'),
('ADM002','Nethmi Silva',     'Female','2019-07-22','Nugegoda',  '2026-01-05'),
('ADM003','Sasindu Fernando', 'Male',  '2019-11-02','Maharagama','2026-01-05'),
('ADM004','Dilini Jayasinghe','Female','2018-05-30','Kotte',     '2025-01-06'),
('ADM005','Ravindu Bandara',  'Male',  '2018-09-18','Boralesgamuwa','2025-01-06'),
('ADM006','Thisuri Wickrama', 'Female','2017-12-09','Nawala',    '2024-01-08'),
('ADM007','Hiruni Mendis',    'Female','2016-04-25','Rajagiriya','2023-01-09'),
('ADM008','Chamod Rajapaksa', 'Male',  '2015-08-11','Battaramulla','2022-01-10'),
('ADM009','Isuri Gunawardena','Female','2019-02-19','Pita Kotte','2026-01-05'),
('ADM010','Sandun Weerasinghe','Male', '2018-10-07','Ethul Kotte','2025-01-06');

INSERT INTO guardian (full_name, nic, phone, email, occupation) VALUES
('Nimal Perera',      '198012345678','0712000001','nimal.p@mail.com',  'Engineer'),
('Kumari Perera',     '198245678901','0712000002','kumari.p@mail.com', 'Nurse'),
('Anura Silva',       '197898765432','0712000003','anura.s@mail.com',  'Accountant'),
('Shalini Fernando',  '198534567890','0712000004','shalini.f@mail.com','Teacher'),
('Priyantha Jayasinghe','197745678123','0712000005','priya.j@mail.com','Businessman'),
('Malkanthi Bandara', '198367891234','0712000006','malka.b@mail.com',  'Banker'),
('Ruwan Wickrama',    '198156789012','0712000007','ruwan.w@mail.com',  'Driver'),
('Sunethra Mendis',   '197989012345','0712000008','sune.m@mail.com',   'Seamstress');

INSERT INTO student_guardian (student_id, guardian_id, relationship, is_primary_contact) VALUES
(1,1,'Father',TRUE),(1,2,'Mother',FALSE),
(2,3,'Father',TRUE),
(3,4,'Mother',TRUE),
(4,5,'Father',TRUE),
(5,6,'Mother',TRUE),
(6,7,'Father',TRUE),
(7,8,'Mother',TRUE),
(8,8,'Guardian',TRUE),
(9,2,'Mother',TRUE),
(10,6,'Mother',TRUE);

INSERT INTO enrollment (student_id, class_id, enrolled_on) VALUES
(1,1,'2026-01-05'),(2,1,'2026-01-05'),(3,2,'2026-01-05'),(9,2,'2026-01-05'),
(4,3,'2026-01-05'),(5,4,'2026-01-05'),(10,4,'2026-01-05'),
(6,6,'2026-01-05'),(7,7,'2026-01-05'),(8,8,'2026-01-05');

INSERT INTO teaching_assignment (teacher_id, subject_id, class_id) VALUES
(1,1,1),(2,2,1),(1,1,2),(2,2,2),
(3,3,3),(4,4,4),(5,5,5),(6,2,6),(7,6,7),(8,7,8);

INSERT INTO attendance (student_id, att_date, status, remarks, marked_by) VALUES
(1,'2026-10-05','Present',NULL,1),(2,'2026-10-05','Present',NULL,1),
(3,'2026-10-05','Absent','Fever',2),(9,'2026-10-05','Present',NULL,2),
(1,'2026-10-06','Present',NULL,1),(2,'2026-10-06','Late','Traffic',1),
(3,'2026-10-06','Present',NULL,2),(9,'2026-10-06','Absent','Family function',2),
(4,'2026-10-05','Present',NULL,3),(5,'2026-10-05','Present',NULL,4),
(4,'2026-10-06','Absent','Sick',3),(5,'2026-10-06','Present',NULL,4);

INSERT INTO exam (exam_name, year_id, term_no, exam_date) VALUES
('Term 1 Test',1,1,'2026-04-10'),
('Term 2 Test',1,2,'2026-08-14');

INSERT INTO result (exam_id, student_id, subject_id, marks) VALUES
(1,1,1,78.5),(1,1,2,85.0),(1,2,1,92.0),(1,2,2,88.5),
(1,3,1,65.0),(1,3,2,59.5),(1,9,1,74.0),(1,9,2,81.0),
(1,4,3,70.0),(1,5,4,83.0),(1,10,4,45.5),
(2,1,1,82.0),(2,1,2,90.0),(2,2,1,95.0),(2,2,2,91.0),
(2,3,1,70.0),(2,3,2,66.0);

INSERT INTO school_event (title, category, event_date, event_time, location, description, created_by) VALUES
('Annual Sports Meet','Sports','2026-10-18','08:00:00','School Sports Ground','Track events, relay races and team games.',8),
('Children''s Day Celebration','Celebration','2026-10-25','09:00:00','School Main Hall','Games, performances and treats for the students.',1),
('Art Exhibition','Arts','2026-11-08','10:00:00','Art Gallery, Block C','Paintings, sculptures and crafts of Grades 1 to 5.',7),
('Educational Trip to National Museum','Educational','2026-11-22','07:30:00','National Museum, Colombo','Grades 4 and 5 learn about Sri Lankan heritage.',5),
('Annual Prize Giving','Ceremony','2026-12-12','17:00:00','School Auditorium','Recognising academic and sports achievements.',1);

-- Passwords stored as SHA-256 hashes (demo password = 'Pass@123')
INSERT INTO user_account (email, password_hash, role, teacher_id, guardian_id) VALUES
('admin@abcprimary.edu',  SHA2('Admin@123',256), 'Admin',  NULL, NULL),
('sarah@abcprimary.edu',  SHA2('Pass@123',256),  'Teacher', 1,   NULL),
('rohan@abcprimary.edu',  SHA2('Pass@123',256),  'Teacher', 2,   NULL),
('nimal.p@mail.com',      SHA2('Pass@123',256),  'Parent',  NULL, 1),
('anura.s@mail.com',      SHA2('Pass@123',256),  'Parent',  NULL, 3);

-- ---------------------------------------------------------------------
-- 4. VIEWS
-- ---------------------------------------------------------------------

-- 4.1 Full class list
CREATE VIEW v_class_list AS
SELECT  CONCAT(g.grade_name,' - ',c.section_name) AS class_name,
        s.admission_no, s.full_name AS student_name, s.gender,
        t.full_name AS class_teacher
FROM enrollment e
JOIN student s       ON s.student_id = e.student_id
JOIN class_section c ON c.class_id   = e.class_id
JOIN grade g         ON g.grade_id   = c.grade_id
JOIN teacher t       ON t.teacher_id = c.class_teacher_id;

-- 4.2 Student result report with grade letter
CREATE VIEW v_student_results AS
SELECT  s.admission_no, s.full_name AS student_name,
        ex.exam_name, sb.subject_name, r.marks,
        CASE WHEN r.marks >= 75 THEN 'A'
             WHEN r.marks >= 65 THEN 'B'
             WHEN r.marks >= 55 THEN 'C'
             WHEN r.marks >= 35 THEN 'S'
             ELSE 'W' END AS grade_letter
FROM result r
JOIN student s  ON s.student_id = r.student_id
JOIN exam ex    ON ex.exam_id   = r.exam_id
JOIN subject sb ON sb.subject_id = r.subject_id;

-- 4.3 Upcoming events (feeds the website Events page)
CREATE VIEW v_upcoming_events AS
SELECT title, category, event_date, event_time, location, description
FROM school_event
WHERE event_date >= CURDATE()
ORDER BY event_date;

-- ---------------------------------------------------------------------
-- 5. SAMPLE QUERIES  (run these live in the presentation)
-- ---------------------------------------------------------------------

-- Q1: List all students of Grade 1 - A
SELECT * FROM v_class_list WHERE class_name = 'Grade 1 - A';

-- Q2: Number of students per class (GROUP BY)
SELECT CONCAT(g.grade_name,' - ',c.section_name) AS class_name,
       COUNT(e.student_id) AS total_students
FROM class_section c
JOIN grade g ON g.grade_id = c.grade_id
LEFT JOIN enrollment e ON e.class_id = c.class_id
GROUP BY c.class_id, g.grade_name, c.section_name;

-- Q3: Parents of a student (many-to-many JOIN)
SELECT s.full_name AS student, gd.full_name AS guardian, sg.relationship, gd.phone
FROM student s
JOIN student_guardian sg ON sg.student_id = s.student_id
JOIN guardian gd         ON gd.guardian_id = sg.guardian_id
WHERE s.admission_no = 'ADM001';

-- Q4: Average marks per subject in Term 1
SELECT sb.subject_name, ROUND(AVG(r.marks),2) AS avg_marks
FROM result r
JOIN subject sb ON sb.subject_id = r.subject_id
WHERE r.exam_id = 1
GROUP BY sb.subject_name
ORDER BY avg_marks DESC;

-- Q5: Students whose average marks are below 50 (needs extra support) - HAVING
SELECT s.full_name, ROUND(AVG(r.marks),2) AS avg_marks
FROM result r JOIN student s ON s.student_id = r.student_id
GROUP BY s.student_id, s.full_name
HAVING AVG(r.marks) < 50;

-- Q6: Top student in each exam (window function RANK)
SELECT exam_name, full_name, avg_marks FROM (
    SELECT ex.exam_name, s.full_name, ROUND(AVG(r.marks),2) AS avg_marks,
           RANK() OVER (PARTITION BY ex.exam_id ORDER BY AVG(r.marks) DESC) AS rnk
    FROM result r
    JOIN student s ON s.student_id = r.student_id
    JOIN exam ex   ON ex.exam_id   = r.exam_id
    GROUP BY ex.exam_id, ex.exam_name, s.student_id, s.full_name
) ranked
WHERE rnk = 1;

-- Q7: Attendance percentage per student
SELECT s.full_name,
       SUM(a.status IN ('Present','Late')) AS days_attended,
       COUNT(*) AS total_days,
       ROUND(100 * SUM(a.status IN ('Present','Late')) / COUNT(*), 1) AS attendance_pct
FROM attendance a JOIN student s ON s.student_id = a.student_id
GROUP BY s.student_id, s.full_name;

-- Q8: Which teacher teaches what to which class
SELECT t.full_name AS teacher, sb.subject_name,
       CONCAT(g.grade_name,' - ',c.section_name) AS class_name
FROM teaching_assignment ta
JOIN teacher t       ON t.teacher_id = ta.teacher_id
JOIN subject sb      ON sb.subject_id = ta.subject_id
JOIN class_section c ON c.class_id = ta.class_id
JOIN grade g         ON g.grade_id = c.grade_id
ORDER BY t.full_name;

-- Q9: Login check (what the website Login page would run)
SELECT user_id, role FROM user_account
WHERE email = 'sarah@abcprimary.edu'
  AND password_hash = SHA2('Pass@123',256)
  AND is_active = TRUE;

-- Q10: UPDATE and DELETE examples
UPDATE student SET address = 'Pita Kotte, Sri Lanka' WHERE admission_no = 'ADM001';
-- DELETE FROM attendance WHERE att_date < '2026-01-01';

-- ---------------------------------------------------------------------
-- 6. STORED PROCEDURE + TRIGGER
-- ---------------------------------------------------------------------
DELIMITER //

-- 6.1 Procedure: report card for one student
CREATE PROCEDURE sp_report_card(IN p_admission_no VARCHAR(10), IN p_exam_id INT)
BEGIN
    SELECT student_name, subject_name, marks, grade_letter
    FROM v_student_results vr
    JOIN exam ex ON ex.exam_name = vr.exam_name
    WHERE vr.admission_no = p_admission_no AND ex.exam_id = p_exam_id;
END //

-- 6.2 Trigger: stop enrolling more students than class capacity
CREATE TRIGGER trg_check_capacity BEFORE INSERT ON enrollment
FOR EACH ROW
BEGIN
    DECLARE v_count INT;
    DECLARE v_cap   INT;
    SELECT COUNT(*) INTO v_count FROM enrollment WHERE class_id = NEW.class_id;
    SELECT capacity INTO v_cap   FROM class_section WHERE class_id = NEW.class_id;
    IF v_count >= v_cap THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class is full';
    END IF;
END //

DELIMITER ;

CALL sp_report_card('ADM001', 1);

-- ---------------------------------------------------------------------
-- 7. SECURITY  (role-based access control)
-- ---------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'school_admin'@'localhost'   IDENTIFIED BY 'Admin#2026';
CREATE USER IF NOT EXISTS 'school_teacher'@'localhost' IDENTIFIED BY 'Teach#2026';
CREATE USER IF NOT EXISTS 'school_parent'@'localhost'  IDENTIFIED BY 'Parent#2026';

-- Admin: everything on this database
GRANT ALL PRIVILEGES ON WP_MT_Meegahathenna_primary_school.* TO 'school_admin'@'localhost';

-- Teacher: read most data, write attendance and results only
GRANT SELECT ON WP_MT_Meegahathenna_primary_school.* TO 'school_teacher'@'localhost';
GRANT INSERT, UPDATE ON WP_MT_Meegahathenna_primary_school.attendance TO 'school_teacher'@'localhost';
GRANT INSERT, UPDATE ON WP_MT_Meegahathenna_primary_school.result     TO 'school_teacher'@'localhost';

-- Parent: read-only through views only (no direct table access)
GRANT SELECT ON WP_MT_Meegahathenna_primary_school.v_student_results TO 'school_parent'@'localhost';
GRANT SELECT ON WP_MT_Meegahathenna_primary_school.v_upcoming_events TO 'school_parent'@'localhost';

FLUSH PRIVILEGES;

/* ---------------------------------------------------------------------
   8. BACKUP AND RESTORE  (run in the OS terminal, NOT inside MySQL)

   Full backup:
     mysqldump -u root -p --routines --triggers WP_MT_Meegahathenna_primary_school > abc_school_backup.sql

   Restore:
     mysql -u root -p WP_MT_Meegahathenna_primary_school < abc_school_backup.sql

   Daily automatic backup (Linux cron, 11.30 pm):
     30 23 * * * mysqldump -u root -pPASSWORD WP_MT_Meegahathenna_primary_school > /backup/school_$(date +\%F).sql

   Windows: use MySQL Workbench -> Server -> Data Export.
   --------------------------------------------------------------------- */
