
"use strict";

/*
 * Digital Attendance System
 * app.js
 *
 * Handles administrator login, logout, session validation,
 * and shared frontend notifications.
 */

(function () {
    const DB = window.DASDatabase;

    function showMessage(message, type = "error") {
        let notification = document.getElementById("dasNotification");

        if (!notification) {
            notification = document.createElement("div");
            notification.id = "dasNotification";
            notification.setAttribute("role", "status");
            notification.setAttribute("aria-live", "polite");

            Object.assign(notification.style, {
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: "99999",
                maxWidth: "360px",
                padding: "14px 20px",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
            });

            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.background =
            type === "success" ? "#15803d" : "#b91c1c";

        notification.style.display = "block";

        window.clearTimeout(notification.hideTimer);

        notification.hideTimer = window.setTimeout(() => {
            notification.style.display = "none";
        }, 3500);
    }

    function getInput(form, name) {
        return form.querySelector(
            `[name="${name}"], #${name}`
        );
    }

    function setLoading(form, loading) {
        const submitButton = form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (!submitButton) return;

        if (loading) {
            submitButton.dataset.originalText =
                submitButton.textContent || submitButton.value || "";

            submitButton.disabled = true;

            if (submitButton.tagName === "BUTTON") {
                submitButton.textContent = "Please wait...";
            } else {
                submitButton.value = "Please wait...";
            }
        } else {
            submitButton.disabled = false;

            if (submitButton.tagName === "BUTTON") {
                submitButton.textContent =
                    submitButton.dataset.originalText || "Submit";
            } else {
                submitButton.value =
                    submitButton.dataset.originalText || "Submit";
            }
        }
    }

    async function handleLogin(form) {
        if (!DB) {
            showMessage("Database connection is unavailable.");
            return;
        }

        const usernameInput = getInput(form, "username");
        const passwordInput = getInput(form, "password");

        if (!usernameInput || !passwordInput) {
            showMessage("Login form fields are missing.");
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showMessage("Please enter your username and password.");
            return;
        }

        setLoading(form, true);

        try {
            const result = await DB.login(username, password);

            if (result.success) {
                showMessage("Login successful.", "success");

                window.location.replace("dashboard.html");
            }
        } catch (error) {
            showMessage(error.message || "Login failed.");
        } finally {
            setLoading(form, false);
        }
    }

    async function handleSetup(form) {
        if (!DB) {
            showMessage("Database connection is unavailable.");
            return;
        }

        const usernameInput = getInput(form, "username");
        const passwordInput = getInput(form, "password");
        const confirmInput =
            getInput(form, "confirmPassword") ||
            getInput(form, "confirm-password");

        if (!usernameInput || !passwordInput) {
            showMessage("Setup form fields are missing.");
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (confirmInput && password !== confirmInput.value) {
            showMessage("Passwords do not match.");
            return;
        }

        if (password.length < 12) {
            showMessage("Admin password must be at least 12 characters.");
            return;
        }

        setLoading(form, true);

        try {
            const result = await DB.setupAdmin(username, password);

            showMessage(
                result.message || "Administrator account created.",
                "success"
            );

            window.setTimeout(() => {
                window.location.replace("login.html");
            }, 1200);
        } catch (error) {
            showMessage(error.message || "Setup failed.");
        } finally {
            setLoading(form, false);
        }
    }

    async function handleLogout() {
        if (!DB) {
            window.location.replace("login.html");
            return;
        }

        try {
            await DB.logout();
        } catch (error) {
            // Redirect to login even if the session has expired.
        }

        window.location.replace("login.html");
    }

    async function checkAdminSession() {
        const protectedPage = [
            "dashboard.html",
            "employee.html",
            "attendance.html",
            "monthly.html"
        ];

        const currentPage = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        if (!protectedPage.includes(currentPage)) {
            return;
        }

        if (!DB) {
            window.location.replace("login.html");
            return;
        }

        try {
            await DB.getCurrentAdmin();
        } catch (error) {
            window.location.replace("login.html");
        }
    }

    function setupPasswordToggles() {
        document.querySelectorAll("[data-toggle-password]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    const targetId =
                        button.getAttribute("data-toggle-password");

                    const input = document.getElementById(targetId);

                    if (!input) return;

                    const isPassword = input.type === "password";

                    input.type = isPassword ? "text" : "password";

                    button.setAttribute(
                        "aria-label",
                        isPassword ? "Hide password" : "Show password"
                    );
                });
            }
        );
    }

    function initialize() {
        const loginForms = document.querySelectorAll(
            "#loginForm, #adminLoginForm, [data-admin-login]"
        );

        loginForms.forEach((form) => {
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                handleLogin(form);
            });
        });

        const setupForms = document.querySelectorAll(
            "#setupForm, [data-admin-setup]"
        );

        setupForms.forEach((form) => {
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                handleSetup(form);
            });
        });

        document.querySelectorAll(
            "#logoutButton, #logoutBtn, [data-logout]"
        ).forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                handleLogout();
            });
        });

        setupPasswordToggles();
        checkAdminSession();
    }

    document.addEventListener("DOMContentLoaded", initialize);

    // Shared functions available to other frontend scripts.
    window.DASApp = {
        showMessage,
        handleLogout,
        checkAdminSession
    };
})();
