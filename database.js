
/*
 * Digital Attendance System
 * database.js
 *
 * Frontend API connection to the local SQLite server.
 * Database operations are handled securely by server.js.
 */

"use strict";

const DASDatabase = (() => {
    const API_BASE = "/api";

    async function request(endpoint, options = {}) {
        const config = {
            method: options.method || "GET",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        };

        if (options.body !== undefined) {
            config.body = JSON.stringify(options.body);
        }

        let response;

        try {
            response = await fetch(`${API_BASE}${endpoint}`, config);
        } catch (error) {
            throw new Error(
                "Cannot connect to the local server. Please start the system first."
            );
        }

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error("Invalid response from the server.");
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || "The request could not be completed."
            );
        }

        return result;
    }

    return {
        // Initial administrator setup
        setupAdmin(username, password) {
            return request("/setup", {
                method: "POST",
                body: { username, password }
            });
        },

        // Administrator authentication
        login(username, password) {
            return request("/auth/admin-login", {
                method: "POST",
                body: { username, password }
            });
        },

        getCurrentAdmin() {
            return request("/auth/me");
        },

        logout() {
            return request("/auth/logout", {
                method: "POST"
            });
        },

        // Departments
        getDepartments() {
            return request("/departments");
        },

        // Employee management
        registerEmployee(employee) {
            return request("/employees", {
                method: "POST",
                body: employee
            });
        },

        getEmployees(department = "") {
            const query = department
                ? `?department=${encodeURIComponent(department)}`
                : "";

            return request(`/employees${query}`);
        },

        updateEmployee(employeeId, employee) {
            return request(
                `/employees/${encodeURIComponent(employeeId)}`,
                {
                    method: "PUT",
                    body: employee
                }
            );
        },

        deleteEmployee(employeeId) {
            return request(
                `/employees/${encodeURIComponent(employeeId)}`,
                {
                    method: "DELETE"
                }
            );
        },

        // Employee attendance
        timeIn(employeeId, password) {
            return request("/attendance/time-in", {
                method: "POST",
                body: { employeeId, password }
            });
        },

        timeOut(employeeId, password) {
            return request("/attendance/time-out", {
                method: "POST",
                body: { employeeId, password }
            });
        },

        // Attendance records
        getAttendance(filters = {}) {
            const params = new URLSearchParams();

            if (filters.department) {
                params.set("department", filters.department);
            }

            if (filters.date) {
                params.set("date", filters.date);
            }

            if (filters.month) {
                params.set("month", filters.month);
            }

            const query = params.toString()
                ? `?${params.toString()}`
                : "";

            return request(`/attendance${query}`);
        },

        // Dashboard summary
        getTodaySummary() {
            return request("/attendance/today-summary");
        }
    };
})();

// Make the API wrapper available to the other frontend files.
window.DASDatabase = DASDatabase;
