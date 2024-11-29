CREATE DATABASE IF NOT EXISTS agvallie_db;
USE agvallie_db;

CREATE TABLE areas (
	area_id INT PRIMARY KEY AUTO_INCREMENT,
    area_width INT NOT NULL,
    area_height INT NOT NULL,
    area_color VARCHAR(50) NOT NULL,
    area_top INT NOT NULL,
    area_left INT NOT NULL,
    area_name VARCHAR(50)
);

CREATE TABLE outlets (
    outlet_id INT PRIMARY KEY AUTO_INCREMENT,
    outlet_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    outlet_angle INT NOT NULL,
    outlet_has_main_switch BOOLEAN DEFAULT 0,
    outlet_has_individual_switch BOOLEAN DEFAULT 0,
    outlet_color VARCHAR(50) NOT NULL,
    outlet_port_count INT NOT NULL,
    outlet_area_id INT NOT NULL,
    outlet_name VARCHAR(50),
    outlet_is_on BOOLEAN DEFAULT 0,
    outlet_checked_at DATETIME,
	FOREIGN KEY (outlet_area_id) REFERENCES areas(area_id)
);

CREATE TABLE ports (
    port_id INT PRIMARY KEY AUTO_INCREMENT,
    outlet_id INT,
    port_position INT,
    port_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    port_risk_level VARCHAR(50),
    port_started_at DATETIME NULL,
    port_ended_at DATETIME NULL,
    port_limit_min INT,
    port_name VARCHAR(50),
    port_color VARCHAR(50) NOT NULL,
    port_shape VARCHAR(50) NOT NULL,
    port_is_on BOOLEAN DEFAULT 0,
    FOREIGN KEY (outlet_id) REFERENCES outlets(outlet_id)
);

CREATE TABLE messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    message_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_is_user BOOLEAN DEFAULT 0,
    message_text VARCHAR(2500),
    message_image VARCHAR(255),
    message_item_id INT,
    message_item_type VARCHAR(50)
);

CREATE TABLE devices (
    device_id INT PRIMARY KEY AUTO_INCREMENT,
    device_name VARCHAR(50) NOT NULL,
    device_x FLOAT NOT NULL,
    device_y FLOAT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    device_status VARCHAR(50),
    device_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_is_favorite BOOLEAN DEFAULT 0
);

CREATE TABLE routines (
    routine_id INT PRIMARY KEY AUTO_INCREMENT,
    routine_name VARCHAR(50) NOT NULL,
    routine_icon VARCHAR(50),
    routine_description VARCHAR(255),
    routine_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    routine_is_favorite BOOLEAN DEFAULT 0
);

CREATE TABLE agvallie_routines (
	agvallie_routine_id INT PRIMARY KEY AUTO_INCREMENT,
    agvallie_routine_name VARCHAR(50) NOT NULL,
    agvallie_routine_icon VARCHAR(50),
    agvallie_routine_description VARCHAR(255),
    agvallie_routine_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    agvallie_routine_is_favorite BOOLEAN DEFAULT 0,
    agvallie_routine_period VARCHAR(50),
    agvallie_routine_outlet_id INT
);

