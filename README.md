
# Digital Attendance System

**Track. Manage. Monitor.**

An offline attendance management system designed for faculty and staff. It allows administrators to manage employee information, monitor daily attendance, and generate monthly attendance records.

## Features

- Secure Administrator Login
- Employee Registration
- Employee Management (Edit and Delete)
- Department Management
- Daily Attendance Records
- Time In and Time Out
- Monthly Attendance Reports
- Attendance Monitoring Dashboard
- SQLite Database
- Offline Local Server

## Departments

- BSCRIM
- BSIT
- BSHM
- BSED
- BSBA
- BEED

## System Requirements

- Windows 10 or Windows 11
- Node.js
- Web Browser (Google Chrome recommended)

## Installation

### 1. Install Node.js

Download and install Node.js from:

https://nodejs.org/

### 2. Open the Project Folder

Open the folder containing the Digital Attendance System files.

### 3. Install Dependencies

Open Command Prompt inside the project folder and execute:

```bash
npm install
```

### 4. Start the System

Run:

```bash
npm start
```

### 5. Open the Website

Open Google Chrome and visit:

http://127.0.0.1:3000

### 6. Create Administrator Account

On the first launch, create your administrator account.

Use a strong password with at least 12 characters.

The administrator account is stored securely using password hashing.

## Database

The system uses SQLite for local data storage.

The database file is generated automatically when the server starts.

All employee and attendance records are stored locally on the computer.

## Offline Usage

The system runs using a local server.

Once Node.js and the required dependencies have been installed, the system can be used without an internet connection.

Keep the server running while using the system.

## Project Structure

```text
Digital Attendance System/
│
├── README.md
├── app.js
├── attendance.html
├── dashboard.html
├── database.js
├── employee.html
├── index.html
├── login.html
├── monthly.html
├── style.css
├── package.json
└── server.js
```

## Project Information

Project Title: Digital Attendance System

Purpose: To provide an efficient and organized attendance monitoring system for faculty and staff.

Platform: Local Web Application

Database: SQLite

Developed for academic purposes.
