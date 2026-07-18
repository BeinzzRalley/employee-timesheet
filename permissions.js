// ── Role & permission helpers ───────────────────────
// Mirrors backend access_level values in middleware/helpers.php:
// employee, supervisor, payroll_admin, system_admin

const ACCESS = {
  SYSTEM_ADMIN:  "system_admin",
  PAYROLL_ADMIN: "payroll_admin",
  SUPERVISOR:    "supervisor",
  EMPLOYEE:      "employee",
};

function accessLevel(account) {
  return account && account.access_level;
}

function isSystemAdmin(account) {
  return accessLevel(account) === ACCESS.SYSTEM_ADMIN;
}

function isPayrollAdmin(account) {
  return accessLevel(account) === ACCESS.PAYROLL_ADMIN;
}

function isSupervisor(account) {
  return accessLevel(account) === ACCESS.SUPERVISOR;
}

function isEmployee(account) {
  return accessLevel(account) === ACCESS.EMPLOYEE;
}

/** system_admin or payroll_admin — no clock-in, full admin tooling */
function isPureAdmin(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN;
}

/** Config pages (shift categories, holidays, etc.) */
function isAdminConfig(account) {
  return isPureAdmin(account);
}

/** Dashboard with workforce overview (dept-scoped for supervisor) */
function isWorkforceDashboard(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN || l === ACCESS.SUPERVISOR;
}

/** Can view leave list beyond own records and approve/reject */
function isLeaveApprover(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN || l === ACCESS.SUPERVISOR;
}

function isLeaveFullAdmin(account) {
  return isPureAdmin(account);
}

// ── Incident reports (incident_reports.php) ───────────
/** Can confirm/dismiss attendance incident reports — PUT → requireRole([supervisor, payroll_admin, system_admin]) */
function isReportValidator(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN || l === ACCESS.SUPERVISOR;
}

function linkedEmployee(db, account) {
  if (!account || account.employee_id == null) return null;
  // eslint-disable-next-line eqeqeq
  return db.employees.find(e => e.employee_id == account.employee_id) || null;
}

function departmentName(db, account) {
  const emp = linkedEmployee(db, account);
  return emp ? (emp.department_name || null) : null;
}

// ── Employee CRUD (employees.php) ─────────────────────
function canCreateEmployee(account) {
  return isSystemAdmin(account) || isPayrollAdmin(account); // POST → requirePayrollAdmin()
}

function canEditEmployee(account) {
  return isSystemAdmin(account) || isPayrollAdmin(account); // PUT → requirePayrollAdmin()
}

function canViewEmployees(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN || l === ACCESS.SUPERVISOR;
}

// ── Time logs (time_logs.php) ─────────────────────────
function canEditTimeLogs(account) {
  return isPureAdmin(account); // PUT → requirePayrollAdmin()
}

function canClockIn(account) {
  return isEmployee(account) || isSupervisor(account);
}

function canViewClockedInNow(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.PAYROLL_ADMIN || l === ACCESS.SUPERVISOR;
}

// ── Scope banner copy ───────────────────────────────
function scopeBannerProps(db, account) {
  if (isSupervisor(account)) {
    const dept = departmentName(db, account);
    return {
      variant: "dept",
      title: dept ? `${dept} — Department scope` : "Department scope",
      detail: "You only see data for your assigned department. Actions outside this scope are blocked on the server.",
    };
  }
  if (isPureAdmin(account)) {
    return {
      variant: "company",
      title: "Company-wide access",
      detail: isSystemAdmin(account)
        ? "Full system access — all departments and configuration."
        : "Payroll administration — all departments. Some system settings require System Admin.",
    };
  }
  return null;
}
