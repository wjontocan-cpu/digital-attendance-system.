
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = 3000;

// Local-only server: accessible only from this computer.
const HOST = "127.0.0.1";
const DB_PATH = path.join(__dirname, "attendance.db");

// A fresh secret is generated each time the server starts.
// Existing sessions will need to log in again after restarting.
const SESSION_SECRET = crypto.randomBytes(48).toString("hex");

app.disable("x-powered-by");
app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use(
    session({
        name: "das_session",
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "strict",
            secure: false, // HTTP on localhost only
            maxAge: 30 * 60 * 1000
        }
    })
);

// SQLite database
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL UNIQUE,
        employee_name TEXT NOT NULL,
        position TEXT NOT NULL CHECK(position IN ('Faculty', 'Staff')),
        department TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        registered_date TEXT NOT NULL DEFAULT CURRENT_DATE
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        attendance_date TEXT NOT NULL,
        time_in TEXT,
        time_out TEXT,
        status TEXT NOT NULL DEFAULT 'Present',
        UNIQUE(employee_id, attendance_date),
        FOREIGN KEY(employee_id) REFERENCES employees(employee_id)
            ON DELETE CASCADE
    );
`);

const departments = [
    "BSCRIM",
    "BSIT",
    "BSHM",
    "BSED",
    "BSBA",
    "BEED"
];

function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function localTime() {
    return new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function isAdmin(req) {
    return req.session && req.session.adminId;
}

function requireAdmin(req, res, next) {
    if (!isAdmin(req)) {
        return res.status(401).json({
            success: false,
            message: "Please log in as administrator."
        });
    }

    next();
}

// Protect the system pages from unauthenticated access.
app.use((req, res, next) => {
    const protectedPages = [
        "/dashboard.html",
        "/employee.html",
        "/attendance.html",
        "/monthly.html"
    ];

    if (protectedPages.includes(req.path) && !isAdmin(req)) {
        return res.redirect("/login.html");
    }

    next();
});

// One-time administrator account setup.
// This endpoint becomes unavailable after the first admin is created.
app.post("/api/setup", async (req, res) => {
    const adminCount = db.prepare(
        "SELECT COUNT(*) AS count FROM admins"
    ).get().count;

    if (adminCount > 0) {
        return res.status(403).json({
            success: false,
            message: "Administrator setup is already completed."
        });
    }

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!/^[a-zA-Z0-9_.-]{4,30}$/.test(username)) {
        return res.status(400).json({
            success: false,
            message: "Username must be 4-30 characters."
        });
    }

    if (password.length < 12 || password.length > 72) {
        return res.status(400).json({
            success: false,
            message: "Password must be 12-72 characters long."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(
            "INSERT INTO admins (username, password_hash) VALUES (?, ?)"
        ).run(username, passwordHash);

        res.json({
            success: true,
            message: "Administrator account created successfully."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to create administrator account."
        });
    }
});

// Basic login attempt limit by IP.
const loginAttempts = new Map();

function checkLoginLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record || now - record.startedAt > 10 * 60 * 1000) {
        loginAttempts.set(ip, {
            count: 0,
            startedAt: now
        });
        return true;
    }

    return record.count < 10;
}

function recordLoginAttempt(ip) {
    const record = loginAttempts.get(ip);

    if (record) {
        record.count += 1;
    }
}

// Administrator login
app.post("/api/auth/admin-login", async (req, res) => {
    const ip = req.ip;

    if (!checkLoginLimit(ip)) {
        return res.status(429).json({
            success: false,
            message: "Too many login attempts. Try again in 10 minutes."
        });
    }

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const admin = db.prepare(
        "SELECT * FROM admins WHERE username = ?"
    ).get(username);

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
        recordLoginAttempt(ip);

        return res.status(401).json({
            success: false,
            message: "Invalid username or password."
        });
    }

    req.session.regenerate((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Unable to start session."
            });
        }

        req.session.adminId = admin.id;
        req.session.username = admin.username;

        res.json({
            success: true,
            message: "Login successful.",
            username: admin.username
        });
    });
});

// Check current administrator session
app.get("/api/auth/me", requireAdmin, (req, res) => {
    res.json({
        success: true,
        username: req.session.username
    });
});

// Administrator logout
app.post("/api/auth/logout", requireAdmin, (req, res) => {
    req.session.destroy((error) => {
        res.clearCookie("das_session");

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Unable to log out."
            });
        }

        res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

// List departments
app.get("/api/departments", requireAdmin, (req, res) => {
    res.json({
        success: true,
        departments
    });
});

// Register employee
app.post("/api/employees", requireAdmin, async (req, res) => {
    const employeeId = String(req.body.employeeId || "").trim();
    const employeeName = String(req.body.employeeName || "").trim();
    const position = String(req.body.position || "").trim();
    const department = String(req.body.department || "").trim();
    const password = String(req.body.password || "");

    if (!employeeId || employeeId.length > 30) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid Employee ID."
        });
    }

    if (!employeeName || employeeName.length > 100) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid employee name."
        });
    }

    if (!["Faculty", "Staff"].includes(position)) {
        return res.status(400).json({
            success: false,
            message: "Select Faculty or Staff."
        });
    }

    if (!departments.includes(department)) {
        return res.status(400).json({
            success: false,
            message: "Select a valid department."
        });
    }

    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
            success: false,
            message: "Employee password must be 8-72 characters."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(`
            INSERT INTO employees
            (employee_id, employee_name, position, department, password_hash)
            VALUES (?, ?, ?, ?, ?)
        `).run(employeeId, employeeName, position, department, passwordHash);

        res.json({
            success: true,
            message: "Employee registered successfully."
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Employee ID already exists or registration failed."
        });
    }
});

// List employees, optionally filtered by department
app.get("/api/employees", requireAdmin, (req, res) => {
    const department = String(req.query.department || "").trim();

    let employees;

    if (department && departments.includes(department)) {
        employees = db.prepare(`
            SELECT employee_id AS employeeId,
                   employee_name AS employeeName,
                   position,
                   department,
                   registered_date AS registeredDate
            FROM employees
            WHERE department = ?
            ORDER BY employee_name
        `).all(department);
    } else {
        employees = db.prepare(`
            SELECT employee_id AS employeeId,
                   employee_name AS employeeName,
                   position,
                   department,
                   registered_date AS registeredDate
            FROM employees
            ORDER BY department, employee_name
        `).all();
    }

    res.json({
        success: true,
        employees
    });
});

// Update employee details
app.put("/api/employees/:employeeId", requireAdmin, (req, res) => {
    const employeeId = String(req.params.employeeId || "").trim();
    const employeeName = String(req.body.employeeName || "").trim();
    const position = String(req.body.position || "").trim();
    const department = String(req.body.department || "").trim();

    if (
        !employeeName ||
        !["Faculty", "Staff"].includes(position) ||
        !departments.includes(department)
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid employee details."
        });
    }

    const result = db.prepare(`
        UPDATE employees
        SET employee_name = ?, position = ?, department = ?
        WHERE employee_id = ?
    `).run(employeeName, position, department, employeeId);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: "Employee not found."
        });
    }

    res.json({
        success: true,
        message: "Employee updated successfully."
    });
});

// Delete employee
app.delete("/api/employees/:employeeId", requireAdmin, (req, res) => {
    const employeeId = String(req.params.employeeId || "").trim();

    const result = db.prepare(
        "DELETE FROM employees WHERE employee_id = ?"
    ).run(employeeId);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: "Employee not found."
        });
    }

    res.json({
        success: true,
        message: "Employee deleted successfully."
    });
});

// Employee Time In
app.post("/api/attendance/time-in", async (req, res) => {
    const employeeId = String(req.body.employeeId || "").trim();
    const password = String(req.body.password || "");

    const employee = db.prepare(
        "SELECT * FROM employees WHERE employee_id = ?"
    ).get(employeeId);

    if (!employee || !(await bcrypt.compare(password, employee.password_hash))) {
        return res.status(401).json({
            success: false,
            message: "Invalid Employee ID or password."
        });
    }

    const date = localDate();
    const time = localTime();

    try {
        db.prepare(`
            INSERT INTO attendance
            (employee_id, attendance_date, time_in, status)
            VALUES (?, ?, ?, 'Present')
        `).run(employeeId, date, time);

        res.json({
            success: true,
            message: "Time In successful.",
            timeIn: time
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "You have already timed in today."
        });
    }
});

// Employee Time Out
app.post("/api/attendance/time-out", async (req, res) => {
    const employeeId = String(req.body.employeeId || "").trim();
    const password = String(req.body.password || "");

    const employee = db.prepare(
        "SELECT * FROM employees WHERE employee_id = ?"
    ).get(employeeId);

    if (!employee || !(await bcrypt.compare(password, employee.password_hash))) {
        return res.status(401).json({
            success: false,
            message: "Invalid Employee ID or password."
        });
    }

    const date = localDate();
    const time = localTime();

    const result = db.prepare(`
        UPDATE attendance
        SET time_out = ?
        WHERE employee_id = ?
          AND attendance_date = ?
          AND time_in IS NOT NULL
          AND time_out IS NULL
    `).run(time, employeeId, date);

    if (result.changes === 0) {
        return res.status(400).json({
            success: false,
            message: "No active Time In found, or you already timed out."
        });
    }

    res.json({
        success: true,
        message: "Time Out successful.",
        timeOut: time
    });
});

// Attendance records
app.get("/api/attendance", requireAdmin, (req, res) => {
    const department = String(req.query.department || "").trim();
    const date = String(req.query.date || "").trim();
    const month = String(req.query.month || "").trim();

    let sql = `
        SELECT
            a.employee_id AS employeeId,
            e.employee_name AS employeeName,
            e.position,
            e.department,
            a.attendance_date AS attendanceDate,
            a.time_in AS timeIn,
            a.time_out AS timeOut,
            a.status
        FROM attendance a
        JOIN employees e ON e.employee_id = a.employee_id
        WHERE 1 = 1
    `;

    const params = [];

    if (department && departments.includes(department)) {
        sql += " AND e.department = ?";
        params.push(department);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sql += " AND a.attendance_date = ?";
        params.push(date);
    }

    if (/^\d{4}-\d{2}$/.test(month)) {
        sql += " AND substr(a.attendance_date, 1, 7) = ?";
        params.push(month);
    }

    sql += " ORDER BY a.attendance_date DESC, e.employee_name ASC";

    const records = db.prepare(sql).all(...params);

    res.json({
        success: true,
        records
    });
});

// Dashboard counts for today's attendance
app.get("/api/attendance/today-summary", requireAdmin, (req, res) => {
    const date = localDate();

    const totalEmployees = db.prepare(
        "SELECT COUNT(*) AS count FROM employees"
    ).get().count;

    const present = db.prepare(`
        SELECT COUNT(*) AS count
        FROM attendance
        WHERE attendance_date = ?
    `).get(date).count;

    const absent = Math.max(totalEmployees - present, 0);

    res.json({
        success: true,
        date,
        totalEmployees,
        present,
        absent
    });
});

// Static website files
app.use(express.static(__dirname, {
    index: "index.html"
}));

// General error handler
app.use((error, req, res, next) => {
    console.error("Server error:", error.message);

    res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

app.listen(PORT, HOST, () => {
    console.log("====================================");
    console.log("Digital Attendance System is running");
    console.log(`Open: http://${HOST}:${PORT}`);
    console.log("Offline local server");
    console.log("====================================");
});
