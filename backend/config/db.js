const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("sslmode=require") ? "" : "?sslmode=require")
});

module.exports = pool;
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("sslmode=require") ? "" : "?sslmode=require")
});

module.exports = pool;
