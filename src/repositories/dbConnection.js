/**
 * @swagger
 * components:
 *   schemas:
 *     DatabaseConnection:
 *       type: object
 *       properties:
 *         host:
 *           type: string
 *           description: The host of the MySQL database
 *         user:
 *           type: string
 *           description: The username to connect to the database
 *         password:
 *           type: string
 *           description: The password to authenticate with the database
 *         database:
 *           type: string
 *           description: The name of the database to connect to
 */


import mysql from 'mysql2/promise';
import 'dotenv/config';

// MySQL 연결
const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // MySQL 패스워드
    database: process.env.DB_NAME // 사용할 데이터베이스 이름
  });

// MySQL 연결 확인
db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

export default db;
