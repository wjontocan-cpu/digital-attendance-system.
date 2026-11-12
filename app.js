
/* =========================================
   DIGITAL ATTENDANCE SYSTEM
   APP.JS
========================================= */

// AUTHENTICATION BACKEND
// We will connect this to the secure backend later.
const AUTH_API = "/api/auth";

// MESSAGE DISPLAY
function showMessage(message, type = "success") {
    const messageBox = document.getElementById("loginMessage");

    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;

    // Automatically hide after 3 seconds
    setTimeout(() => {
        messageBox.textContent = "";
        messageBox.className = "message";
    }, 3000);
}

// PASSWORD EYE TOGGLE
const togglePassword = document.getElementById("togglePassword");
const adminPassword = document.getElementById("adminPassword");

if (togglePassword && adminPassword) {

    togglePassword.addEventListener("click", function () {

        const isPassword =
            adminPassword.type === "password";

        adminPassword.type =
            isPassword ? "text" : "password";

        togglePassword.textContent =
            isPassword ? "🙈" : "👁";

        togglePassword.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

// ADMIN LOGIN
const adminLoginForm =
    document.getElementById("adminLoginForm");

if (adminLoginForm) {

    adminLoginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const username =
            document.getElementById("adminUsername").value.trim();

        const password =
            document.getElementById("adminPassword").value;

        const loginButton =
            adminLoginForm.querySelector(".login-button");

        if (!username || !password) {
            showMessage(
                "Please enter your username and password.",
                "error"
            );
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "PLEASE WAIT...";

        try {

            const response = await fetch(
                `${AUTH_API}/admin-login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    }),
                    credentials: "include"
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                showMessage(
                    result.message || "Invalid username or password.",
                    "error"
                );
                return;
            }

            // Store only the authenticated session information.
            sessionStorage.setItem(
                "adminAuthenticated",
                "true"
            );

            showMessage("Login Successful!", "success");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {

            showMessage(
                "Unable to connect to the authentication server.",
                "error"
            );

        } finally {

            loginButton.disabled = false;
            loginButton.innerHTML = "<span>⇥</span> LOG IN";

        }
    });
}

// ADMIN SESSION CHECK
function requireAdmin() {

    const authenticated =
        sessionStorage.getItem("adminAuthenticated");

    if (authenticated !== "true") {
        window.location.href = "index.html";
    }
}

// ADMIN LOGOUT
function logoutAdmin() {

    sessionStorage.removeItem("adminAuthenticated");

    window.location.href = "index.html";
}
