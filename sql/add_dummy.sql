-- areas 테이블 더미 데이터
INSERT INTO areas (area_width, area_height, area_color, area_top, area_left, area_name)
VALUES
(200, 300, 'red', 0, 0, 'Living Room'),
(400, 300, 'blue', 10, 10, 'Bedroom'),
(500, 500, 'green', 20, 20, 'Kitchen');

-- outlets 테이블 더미 데이터
INSERT INTO outlets (outlet_angle, outlet_has_main_switch, outlet_has_individual_switch, outlet_color, outlet_port_count, outlet_area_id, outlet_name, outlet_is_on)
VALUES
(90, 1, 1, 'white', 4, 1, 'Main Outlet', 1),
(180, 0, 1, 'black', 2, 2, 'Bedroom Outlet', 0),
(45, 1, 0, 'gray', 6, 3, 'Kitchen Outlet', 1);

-- ports 테이블 더미 데이터
INSERT INTO ports (outlet_id, port_position, port_risk_level, port_started_at, port_ended_at, port_limit_min, port_name, port_color, port_shape, port_is_on)
VALUES
(1, 1, 'low', '2024-11-01 08:00:00', NULL, 60, 'USB Port 1', 'red', 'circle', 1),
(1, 2, 'high', '2024-11-01 09:00:00', NULL, 30, 'USB Port 2', 'blue', 'square', 0),
(2, 1, 'medium', '2024-11-02 10:00:00', NULL, 120, 'AC Port 1', 'green', 'rectangle', 1),
(3, 3, 'low', '2024-11-03 11:00:00', NULL, 90, 'AC Port 3', 'yellow', 'triangle', 1);

-- messages 테이블 더미 데이터
INSERT INTO messages (message_is_user, message_text, message_image, message_item_id, message_item_type)
VALUES
(1, 'Turn off the bedroom light.', NULL, 2, 'outlet'),
(0, 'All lights turned off successfully.', NULL, NULL, NULL),
(1, 'Check the power usage.', 'usage.png', 1, 'port');

-- devices 테이블 더미 데이터
INSERT INTO devices (device_name, device_x, device_y, device_type, device_status, device_is_favorite)
VALUES
('Robot Cleaner', 150.5, 200.3, 'AGV', 'Active', 1),
('Smart Plug', 300.0, 400.5, 'Outlet', 'Standby', 0),
('Light Sensor', 50.0, 60.0, 'Sensor', 'Operational', 1);

-- routines 테이블 더미 데이터
INSERT INTO routines (routine_name, routine_icon, routine_description, routine_is_favorite)
VALUES
('Morning Routine', 'sun.png', 'Turn on all lights at 7 AM', 1),
('Night Routine', 'moon.png', 'Turn off all lights at 11 PM', 0);

-- agvallie_routines 테이블 더미 데이터
INSERT INTO agvallie_routines (agvallie_routine_name, agvallie_routine_icon, agvallie_routine_description, agvallie_routine_period, agvallie_routine_outlet_id)
VALUES
('Cleaning Routine', 'vacuum.png', 'Activate robot cleaner at 9 AM daily', 'Daily', 1),
('Safety Check', 'alert.png', 'Check all outlets every Monday', 'Weekly', 2);

-- areas 테이블 데이터는 위에서 이미 추가됨.
