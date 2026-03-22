-- ============================================================
-- CoWorking Cafe — Reset & Setup Database
-- Chay script nay trong MySQL Workbench truoc khi start app
-- Spring Boot se tu dong tao lai bang via Hibernate (ddl-auto=create)
-- ============================================================

DROP DATABASE IF EXISTS coworking_cafe;

CREATE DATABASE coworking_cafe
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE coworking_cafe;

-- ============================================================
-- NOTE: Hibernate se tu dong tao cac bang khi start Spring Boot.
-- Script duoi day chi de tham khao schema + du lieu mau.
-- KHONG can chay phan CREATE TABLE va INSERT nay neu dung Hibernate.
-- ============================================================

-- 1. Admin (1 ban quan tri duy nhat)
-- CREATE TABLE Admin (
--     admin_id INT PRIMARY KEY DEFAULT 1,
--     username VARCHAR(100) NOT NULL UNIQUE,
--     phone VARCHAR(15) NOT NULL UNIQUE,
--     password_hash VARCHAR(255) NOT NULL
-- );

-- 2. Users (khach hang)
-- CREATE TABLE Users (
--     users_id INT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(150) NOT NULL,
--     phone VARCHAR(15) NOT NULL UNIQUE,
--     password_hash VARCHAR(255) NOT NULL,
--     remaining_hours DECIMAL(10,2) DEFAULT 0,
--     status ENUM('ACTIVE','INACTIVE','BANNED') DEFAULT 'ACTIVE',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 3. Packages (Goi gio)
-- CREATE TABLE Packages (
--     packages_id INT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     hours_amount DECIMAL(10,2) NOT NULL,
--     price DECIMAL(12,2) NOT NULL,
--     status ENUM('AVAILABLE','DISABLED') DEFAULT 'AVAILABLE'
-- );

-- 4. Services (Do an / nuoc)
-- CREATE TABLE Services (
--     services_id INT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(150) NOT NULL,
--     type ENUM('FOOD','DRINK') NOT NULL,
--     price DECIMAL(12,2) NOT NULL,
--     status ENUM('AVAILABLE','OUT_OF_STOCK') DEFAULT 'AVAILABLE'
-- );

-- 5. Sessions (Phien ngoi - 'Sessions' la reserved keyword nen Hibernate dung backtick)
-- CREATE TABLE `Sessions` (
--     sessions_id INT AUTO_INCREMENT PRIMARY KEY,
--     users_id INT NOT NULL,
--     check_in DATETIME NOT NULL,
--     check_out DATETIME NULL,
--     hours_used DECIMAL(10,2) DEFAULT 0,
--     status ENUM('ONGOING','COMPLETED') DEFAULT 'ONGOING',
--     FOREIGN KEY (users_id) REFERENCES Users(users_id)
-- );

-- 6. Service_requests (Yeu cau goi dich vu / mua goi gio)
-- CREATE TABLE Service_requests (
--     service_requests_id INT AUTO_INCREMENT PRIMARY KEY,
--     users_id INT NOT NULL,
--     sessions_id INT NULL,
--     services_id INT NULL,
--     packages_id INT NULL,
--     quantity INT DEFAULT 1,
--     total_price DECIMAL(12,2),
--     status ENUM('PENDING','APPROVED','PAID','CANCELLED') DEFAULT 'PENDING',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (users_id) REFERENCES Users(users_id),
--     FOREIGN KEY (sessions_id) REFERENCES `Sessions`(sessions_id),
--     FOREIGN KEY (services_id) REFERENCES Services(services_id),
--     FOREIGN KEY (packages_id) REFERENCES Packages(packages_id)
-- );

-- 7. Transactions (Thanh toan - cung la reserved keyword)
-- CREATE TABLE `Transactions` (
--     transactions_id INT AUTO_INCREMENT PRIMARY KEY,
--     service_requests_id INT NOT NULL,
--     amount DECIMAL(12,2) NOT NULL,
--     payment_method ENUM('CASH','BANK','MOMO') NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (service_requests_id) REFERENCES Service_requests(service_requests_id)
-- );

SELECT 'Database coworking_cafe da duoc tao. Hay start Spring Boot de Hibernate tao bang tu dong.' AS message;
