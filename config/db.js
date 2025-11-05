import mysql from "mysql2/promise";

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "linkverse_db",
  DB_PORT = 3306,
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function dbHealthCheck() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
    return true;
  } finally {
    conn.release();
  }
}
