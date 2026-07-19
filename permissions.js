// Role & permissions/access level

const ACCESS = {
  SYSTEM_ADMIN:    "system_admin",
  HUMAN_RESOURCES: "human_resources",
  SUPERVISOR:      "supervisor",
  EMPLOYEE:        "employee",
};

function accessLevel(account) {
  return account && account.access_level;
}

function isSystemAdmin(account) {
  return accessLevel(account) === ACCESS.SYSTEM_ADMIN;
}

function isHumanResources(account) {
  return accessLevel(account) === ACCESS.HUMAN_RESOURCES;
}

function isSupervisor(account) {
  return accessLevel(account) === ACCESS.SUPERVISOR;
}

function isEmployee(account) {
  return accessLevel(account) === ACCESS.EMPLOYEE;
}

/** system_admin or human_resources — no clock-in, full admin tooling */
function isPureAdmin(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES;
}

/** Config pages (shift categories, holidays, etc.) */
function isAdminConfig(account) {
  return isPureAdmin(account);
}

/** Dashboard with workforce overview (dept-scoped for supervisor) */
function isWorkforceDashboard(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

/** Can view leave list beyond own records and approve/reject */
function isLeaveApprover(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

function isLeaveFullAdmin(account) {
  return isPureAdmin(account);
}

// Incident reports
/** Can confirm/dismiss attendance incident reports — PUT → requireRole([supervisor, human_resources, system_admin]) */
function isReportValidator(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

function linkedEmployee(db, account) {
  if (!account || account.employee_id == null) return null;
  return db.employees.find(e => e.employee_id == account.employee_id) || null;
}

// Department name
function departmentName(db, account) {
  const emp = linkedEmployee(db, account);
  return emp ? (emp.department_name || null) : null;
}

// Employee CRUD
function canCreateEmployee(account) {
  return isSystemAdmin(account) || isHumanResources(account);
}

// Employee Edit
function canEditEmployee(account) {
  return isSystemAdmin(account) || isHumanResources(account);
}

function canViewEmployees(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

// Time logs
function canEditTimeLogs(account) {
  return isPureAdmin(account);
}

function canClockIn(account) {
  return isEmployee(account) || isSupervisor(account);
}

function canViewClockedInNow(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

// Scope banner
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
        : "Human resources administration — all departments. Some system settings require System Admin.",
    };
  }
  return null;
}
