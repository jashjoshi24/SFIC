const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = require("../config/db");

async function migrate() {
    try {
        const schema = fs.readFileSync(
            path.join(__dirname, "../database/schema.sql"),
            "utf8"
        );

        await pool.query(schema);
        console.log("Database schema applied successfully.");
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();
