/**
 * Test VegPro MS SQL credentials.
 * Usage: node scripts/test-mssql-connection.mjs
 * SQL login: MSSQL_USER / MSSQL_PASSWORD
 * Windows login on FDB: MSSQL_AUTH=windows
 */
import { connectMssql } from "./mssql-connect.mjs";

const { pool } = await connectMssql();
const result = await pool.request().query("SELECT DB_NAME() AS db, SYSTEM_USER AS login_name, @@VERSION AS version");
const row = result.recordset[0];
console.log(`OK: connected to ${row.db} as ${row.login_name}`);
console.log(String(row.version).split("\n")[0]);
await pool.close();
