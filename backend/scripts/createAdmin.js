const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const bcrypt = require("bcryptjs");
const readline = require("readline");
const pool = require("../config/db");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function askPassword() {
    return new Promise((resolve, reject) => {
        if (!process.stdin.isTTY) {
            reject(new Error("Run this script in an interactive terminal."));
            return;
        }

        process.stdout.write("Admin password: ");
        let password = "";

        process.stdin.setRawMode(true);
        process.stdin.resume();

        function onData(key) {
            if (key[0] === 3) {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener("data", onData);
                reject(new Error("Cancelled."));
                return;
            }

            if (key[0] === 13) {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener("data", onData);
                process.stdout.write("\n");
                resolve(password);
            } else if (key[0] === 8 || key[0] === 127) {
                password = password.slice(0, -1);
            } else if (key[0] >= 32) {
                password += key.toString();
            }
        }

        process.stdin.on("data", onData);
    });
}

async function createAdmin() {
    try {
        const name = (await ask("Admin name: ")).trim();
        const email = (await ask("Admin email: ")).trim().toLowerCase();

        if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Valid name and email are required.");
        }

        const password = await askPassword();

        if (password.length < 12) {
            throw new Error("Password must contain at least 12 characters.");
        }

        const existing = await pool.query(
            "SELECT id FROM admin_users WHERE email = $1",
            [email]
        );

        if (existing.rows.length) {
            throw new Error("An admin with this email already exists.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO admin_users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'admin')`,
            [name, email, passwordHash]
        );

        console.log("Admin account created successfully.");
    } catch (error) {
        console.error("Admin setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();
