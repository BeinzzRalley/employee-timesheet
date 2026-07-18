// Modal

function openModal({ title, body, wide = false, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = `modal${wide ? " modal-wide" : ""}`;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" aria-label="Close">&#x2715;</button>
    </div>
    <div class="modal-body">${typeof body === "string" ? body : ""}</div>
  `;

  if (typeof body !== "string") {
    modal.querySelector(".modal-body").appendChild(body);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  modal.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  return { overlay, modal, close };
}

// Table builder

function buildTable(headers, rows, emptyMsg = "No records found") {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  if (!rows.length) {
    wrap.innerHTML = `<div class="table-empty">${emptyMsg}</div>`;
    return wrap;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hRow  = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement("td");
      if (cell instanceof HTMLElement) {
        td.appendChild(cell);
      } else {
        td.innerHTML = cell;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// Scope banner

function buildScopeBanner({ variant, title, detail }) {
  const icons = { dept: "🏢", company: "🌐", personal: "👤" };
  const banner = document.createElement("div");
  banner.className = `scope-banner scope-banner-${variant}`;
  banner.innerHTML = `
    <div class="scope-banner-icon">${icons[variant] || "ℹ️"}</div>
    <div>
      <div class="scope-banner-title">${title}</div>
      ${detail ? `<div class="scope-banner-detail">${detail}</div>` : ""}
    </div>
  `;
  return banner;
}

// Sidebar

function buildSidebar({ navSections, navItems, activeId, onNav, account, emp, onLogout }) {
  const aside = document.createElement("aside");
  aside.className = "sidebar";

  const displayName = emp ? emp.full_name : account.username;
  const deptLine = emp && emp.department_name
    ? `<div class="sidebar-dept">${emp.department_name}</div>`
    : "";

  aside.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${icons.timer}</div>
      <span>LaborTrack</span>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        ${avatarHTML(displayName, "sm")}
        <div style="min-width:0">
          <div class="sidebar-user-name">${displayName}</div>
          <div class="sidebar-user-role">${roleLabel(account.access_level)}</div>
          ${deptLine}
        </div>
      </div>
      <button class="logout-btn" id="change-pw-btn" style="margin-bottom:6px">${icons.key} Change Password</button>
      <button class="logout-btn" id="logout-btn">${icons.logout} Sign Out</button>
    </div>
  `;

  const nav = aside.querySelector("#sidebar-nav");

  function appendNavItem({ id, label, icon }) {
    const btn = document.createElement("button");
    btn.className = `nav-btn${id === activeId ? " active" : ""}`;
    btn.dataset.id = id;
    btn.innerHTML = `${icon || ""} ${label}`;
    btn.addEventListener("click", () => onNav(id));
    nav.appendChild(btn);
  }

  if (navSections && navSections.length) {
    navSections.forEach(section => {
      if (section.label) {
        const lbl = document.createElement("div");
        lbl.className = "nav-section-label";
        lbl.textContent = section.label;
        nav.appendChild(lbl);
      }
      section.items.forEach(appendNavItem);
    });
  } else {
    (navItems || []).forEach(appendNavItem);
  }

  aside.querySelector("#logout-btn").addEventListener("click", onLogout);
  aside.querySelector("#change-pw-btn").addEventListener("click", openChangePasswordModal);
  return aside;
}

// Page header

function pageHeader(title, sub, actionEl) {
  const div = document.createElement("div");
  div.className = "page-header";
  div.innerHTML = `
    <div class="page-header-text">
      <h1>${title}</h1>
      ${sub ? `<p>${sub}</p>` : ""}
    </div>
  `;
  if (actionEl) div.appendChild(actionEl);
  return div;
}

// Field builder

function buildField(label, inputEl) {
  const div = document.createElement("div");
  div.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  div.appendChild(lbl);
  div.appendChild(inputEl);
  return div;
}

function makeInput(type, value, placeholder) {
  const inp = document.createElement("input");
  inp.type = type || "text";
  inp.value = value || "";
  inp.placeholder = placeholder || "";
  inp.className = "inp";
  return inp;
}

function makeSelect(options, value) {
  const sel = document.createElement("select");
  sel.className = "sel";
  options.forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    if (String(val) === String(value)) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

// Shared UI helpers

function buildEditDeleteActions({ onEdit, onDelete }) {
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-ghost btn-sm";
  editBtn.innerHTML = `${icons.pencil} Edit`;
  editBtn.addEventListener("click", onEdit);
  actions.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-ghost btn-sm";
  delBtn.style.color = "var(--red, #ef4444)";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", onDelete);
  actions.appendChild(delBtn);

  return actions;
}

function openConfirmModal({ title, message, keepLabel, confirmLabel, danger = true, onConfirm }) {
  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex-direction:column;gap:18px";

  const msg = document.createElement("p");
  msg.className = "text-sm";
  msg.textContent = message;
  body.appendChild(msg);

  const footer = document.createElement("div");
  footer.className = "modal-footer";

  const keepBtn = document.createElement("button");
  keepBtn.className = "btn btn-outline";
  keepBtn.textContent = keepLabel || "Cancel";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = danger ? "btn btn-danger" : "btn btn-primary";
  confirmBtn.textContent = confirmLabel || "Confirm";

  footer.appendChild(keepBtn);
  footer.appendChild(confirmBtn);
  body.appendChild(footer);

  const { close } = openModal({ title, body });
  keepBtn.addEventListener("click", close);

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    try {
      await onConfirm();
      close();
    } catch (err) {
      showToast(err.message || "Action failed.", "error");
      confirmBtn.disabled = false;
    }
  });
}

function appendModalFooter(body, { isEdit, saveLabel, onSave }) {
  const errEl = document.createElement("div");
  errEl.className = "alert-error";
  errEl.style.display = "none";
  body.appendChild(errEl);

  const footer = document.createElement("div");
  footer.className = "modal-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-outline";
  cancelBtn.textContent = "Cancel";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary";
  saveBtn.innerHTML = `${icons.check} ${saveLabel(isEdit)}`;

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  body.appendChild(footer);

  return { errEl, cancelBtn, saveBtn };
}

async function reloadDbCollection(db, key, url, onDbChange, errorMsg) {
  try {
    db[key] = await apiRequest(url);
    onDbChange(db);
    return db[key];
  } catch (err) {
    showToast(err.message || errorMsg, "error");
    return null;
  }
}

function buildSearchBar({ placeholder, value = "", onInput, flex = true }) {
  const searchBar = document.createElement("div");
  searchBar.className = "search-bar";
  if (flex) searchBar.style.flex = "1";
  searchBar.innerHTML = `${icons.search}`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.value = value;
  input.addEventListener("input", e => onInput(e.target.value));
  searchBar.appendChild(input);

  return searchBar;
}

function buildStatPills(stats) {
  const strip = document.createElement("div");
  strip.style.cssText = "display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap";

  stats.forEach(s => {
    const pill = document.createElement("div");
    pill.style.cssText = "background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:10px";
    pill.innerHTML = `
      <span style="font-size:1.3rem;font-weight:800;color:${s.color}">${s.value}</span>
      <span style="font-size:0.75rem;color:var(--text-muted);font-weight:500">${s.label}</span>
    `;
    strip.appendChild(pill);
  });

  return strip;
}
