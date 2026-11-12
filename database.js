
/* =========================================
   DIGITAL ATTENDANCE SYSTEM
   DATABASE.JS
========================================= */

const DB = {

    // STORAGE KEYS
    EMPLOYEES_KEY: "das_employees",
    ATTENDANCE_KEY: "das_attendance",
    ADMIN_KEY: "das_admin",

    // GET DATA
    getEmployees() {
        return JSON.parse(
            localStorage.getItem(this.EMPLOYEES_KEY) || "[]"
        );
    },

    getAttendance() {
        return JSON.parse(
            localStorage.getItem(this.ATTENDANCE_KEY) || "[]"
        );
    },

    // SAVE DATA
    saveEmployees(employees) {
        localStorage.setItem(
            this.EMPLOYEES_KEY,
            JSON.stringify(employees)
        );
    },

    saveAttendance(records) {
        localStorage.setItem(
            this.ATTENDANCE_KEY,
            JSON.stringify(records)
        );
    },

    // EMPLOYEE REGISTRATION
    addEmployee(employee) {
        const employees = this.getEmployees();

        const exists = employees.some(
            emp => emp.employeeId === employee.employeeId
        );

        if (exists) {
            return {
                success: false,
                message: "Employee ID already registered."
            };
        }

        employee.registeredDate =
            new Date().toISOString().split("T")[0];

        employees.push(employee);

        this.saveEmployees(employees);

        return {
            success: true,
            message: "Employee successfully registered."
        };
    },

    // FIND EMPLOYEE
    getEmployee(employeeId) {
        return this.getEmployees().find(
            emp => emp.employeeId === employeeId
        );
    },

    // UPDATE EMPLOYEE
    updateEmployee(employeeId, updatedData) {
        const employees = this.getEmployees();

        const index = employees.findIndex(
            emp => emp.employeeId === employeeId
        );

        if (index === -1) {
            return {
                success: false,
                message: "Employee not found."
            };
        }

        employees[index] = {
            ...employees[index],
            ...updatedData,
            employeeId: employeeId
        };

        this.saveEmployees(employees);

        return {
            success: true,
            message: "Employee successfully updated."
        };
    },

    // DELETE EMPLOYEE
    deleteEmployee(employeeId) {
        const employees = this.getEmployees();

        const filtered = employees.filter(
            emp => emp.employeeId !== employeeId
        );

        if (filtered.length === employees.length) {
            return {
                success: false,
                message: "Employee not found."
            };
        }

        this.saveEmployees(filtered);

        return {
            success: true,
            message: "Employee successfully deleted."
        };
    },

    // GET EMPLOYEES BY DEPARTMENT
    getEmployeesByDepartment(department) {
        return this.getEmployees().filter(
            emp => emp.department === department
        );
    },

    // GET ATTENDANCE BY DATE
    getAttendanceByDate(date) {
        return this.getAttendance().filter(
            record => record.date === date
        );
    },

    // GET ATTENDANCE BY DEPARTMENT
    getAttendanceByDepartment(department) {
        const employees = this.getEmployeesByDepartment(department);

        const employeeIds = employees.map(
            emp => emp.employeeId
        );

        return this.getAttendance().filter(
            record => employeeIds.includes(record.employeeId)
        );
    },

    // GET MONTHLY ATTENDANCE
    getMonthlyAttendance(year, month) {
        const records = this.getAttendance();

        const selectedMonth =
            `${year}-${String(month).padStart(2, "0")}`;

        return records.filter(
            record => record.date.startsWith(selectedMonth)
        );
    },

    // GET MONTHLY RECORD BY DEPARTMENT
    getMonthlyAttendanceByDepartment(year, month, department) {
        const employees = this.getEmployeesByDepartment(department);

        const employeeIds = employees.map(
            emp => emp.employeeId
        );

        return this.getMonthlyAttendance(year, month).filter(
            record => employeeIds.includes(record.employeeId)
        );
    },

    // TIME IN
    timeIn(employeeId) {
        const employee = this.getEmployee(employeeId);

        if (!employee) {
            return {
                success: false,
                message: "Employee not registered."
            };
        }

        const now = new Date();

        const date = now.toISOString().split("T")[0];

        const attendance = this.getAttendance();

        let record = attendance.find(
            item =>
                item.employeeId === employeeId &&
                item.date === date
        );

        if (record && record.timeIn) {
            return {
                success: false,
                message: "You have already timed in today."
            };
        }

        if (!record) {
            record = {
                attendanceId: Date.now().toString(),
                employeeId: employee.employeeId,
                employeeName: employee.name,
                position: employee.position,
                department: employee.department,
                date: date,
                timeIn: now.toLocaleTimeString(),
                timeOut: "",
                status: "Present"
            };

            attendance.push(record);

        } else {
            record.timeIn = now.toLocaleTimeString();
            record.status = "Present";
        }

        this.saveAttendance(attendance);

        return {
            success: true,
            message: "Successfully Timed In!"
        };
    },

    // TIME OUT
    timeOut(employeeId) {
        const now = new Date();

        const date = now.toISOString().split("T")[0];

        const attendance = this.getAttendance();

        const record = attendance.find(
            item =>
                item.employeeId === employeeId &&
                item.date === date
        );

        if (!record || !record.timeIn) {
            return {
                success: false,
                message: "Please Time In first."
            };
        }

        if (record.timeOut) {
            return {
                success: false,
                message: "You have already timed out today."
            };
        }

        record.timeOut = now.toLocaleTimeString();

        this.saveAttendance(attendance);

        return {
            success: true,
            message: "Successfully Timed Out!"
        };
    },

    // UPDATE ATTENDANCE RECORD
    updateAttendance(attendanceId, updatedData) {
        const attendance = this.getAttendance();

        const index = attendance.findIndex(
            record => record.attendanceId === attendanceId
        );

        if (index === -1) {
            return {
                success: false,
                message: "Attendance record not found."
            };
        }

        attendance[index] = {
            ...attendance[index],
            ...updatedData
        };

        this.saveAttendance(attendance);

        return {
            success: true,
            message: "Attendance successfully updated."
        };
    },

    // DELETE ATTENDANCE RECORD
    deleteAttendance(attendanceId) {
        const attendance = this.getAttendance();

        const filtered = attendance.filter(
            record => record.attendanceId !== attendanceId
        );

        if (filtered.length === attendance.length) {
            return {
                success: false,
                message: "Attendance record not found."
            };
        }

        this.saveAttendance(filtered);

        return {
            success: true,
            message: "Attendance record successfully deleted."
        };
    }

};
