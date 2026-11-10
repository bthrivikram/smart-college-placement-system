
USE smart_placement_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    srn VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    cgpa DECIMAL(4, 2),
    graduation_year YEAR,
    department VARCHAR(100),
    profile_photo VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_students_cgpa
        CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10))
);

CREATE TABLE resumes (
    resume_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(100) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    file_size INT UNSIGNED NOT NULL,
    uploaded_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_resumes_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
);

CREATE TABLE skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_skills (
    student_id INT NOT NULL,
    skill_id INT NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (student_id, skill_id),

    CONSTRAINT fk_student_skills_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student_skills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE placement_drives (
    drive_id INT AUTO_INCREMENT PRIMARY KEY,

    company_name VARCHAR(150) NOT NULL,
    job_role VARCHAR(150) NOT NULL,
    job_description TEXT,

    minimum_cgpa DECIMAL(4, 2),
    eligible_department VARCHAR(500) NULL,
    eligible_graduation_year YEAR,

    job_location VARCHAR(150),
    salary_package VARCHAR(100),

    application_deadline DATETIME NOT NULL,

    status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',

    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    total_applications INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_placement_drives_admin
        FOREIGN KEY (created_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_placement_drives_cgpa
        CHECK (
            minimum_cgpa IS NULL
            OR (minimum_cgpa >= 0 AND minimum_cgpa <= 10)
        ),

    INDEX idx_placement_drives_status (status),
    INDEX idx_placement_drives_deadline (application_deadline)
);

CREATE TABLE drive_required_skills (
    drive_id INT NOT NULL,
    skill_id INT NOT NULL,

    PRIMARY KEY (drive_id, skill_id),

    CONSTRAINT fk_drive_skills_drive
        FOREIGN KEY (drive_id)
        REFERENCES placement_drives(drive_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_drive_skills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    drive_id INT NOT NULL,

    status ENUM(
        'APPLIED',
        'SHORTLISTED',
        'REJECTED',
        'SELECTED'
    ) NOT NULL DEFAULT 'APPLIED',

    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_applications_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_applications_drive
        FOREIGN KEY (drive_id)
        REFERENCES placement_drives(drive_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_student_drive
        UNIQUE (student_id, drive_id),

    INDEX idx_applications_drive_status (drive_id, status),
    INDEX idx_applications_student_status (student_id, status)
);

-- Automatically close placement drives after their application deadline
CREATE EVENT IF NOT EXISTS close_expired_drives
ON SCHEDULE EVERY 1 MINUTE
DO
    UPDATE placement_drives
    SET status = 'CLOSED'
    WHERE status = 'OPEN'
      AND application_deadline <= NOW();


DELIMITER //

CREATE TRIGGER after_application_insert
AFTER INSERT ON applications
FOR EACH ROW
BEGIN
    UPDATE placement_drives
    SET total_applications = total_applications + 1
    WHERE drive_id = NEW.drive_id;
END //

DELIMITER ;

CREATE TABLE placement_statistics (
    statistic_id INT PRIMARY KEY,
    total_offers INT NOT NULL DEFAULT 0
);


DELIMITER //

CREATE TRIGGER after_application_update_offer_count
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status <> 'SELECTED' AND NEW.status = 'SELECTED' THEN
        UPDATE placement_statistics
        SET total_offers = total_offers + 1
        WHERE statistic_id = 1;

    ELSEIF OLD.status = 'SELECTED' AND NEW.status <> 'SELECTED' THEN
        UPDATE placement_statistics
        SET total_offers = total_offers - 1
        WHERE statistic_id = 1;
    END IF;
END //

DELIMITER ;