const { Pool } = require('pg');

const db = new Pool({
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER
});
exports.db = db;

exports.connectToDB = async function connectToDB(callback) {
  await db.connect();
  callback();
}
