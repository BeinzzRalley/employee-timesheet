// Time Log Claims

function isClaimApprover(account) {
  const l = accessLevel(account);
  return l === ACCESS.SYSTEM_ADMIN || l === ACCESS.HUMAN_RESOURCES || l === ACCESS.SUPERVISOR;
}

function renderTimeLogClaims(db, account, onDbChange) {
  const page = document.createElement("div");
  page.className = "page";

  const approverView   = isClaimApprover(account);
  const employeeView   = isEmployee(account) || isSupervisor(account);
  const fullAdmin      = isPureAdmin(account);
  const supervisorView = isSupervisor(account);

  let filterStatus = "";

  function refresh() {
    page.innerHTML = "";
    render();
  }

  async function reloadClaims() {
    try {
      db.timeLogClaims = await fetchTimeLogClaims();
      onDbChange(db);
    } catch (err) {
      showToast(err.message || "Could not reload claims.", "error");
    }
  }

  function render() {
    const actionEl = document.createElement("div");
    if (employeeView && account.employee_id != null) {
      const fileBtn = document.createElement("button");
      fileBtn.className = "btn btn-primary";
      fileBtn.innerHTML = `${icons.plus} File Claim`;
      fileBtn.addEventListener("click", () => openClaimModal(null));
      actionEl.appendChild(fileBtn);
    }

    page.appendChild(pageHeader(
      employeeView && !fullAdmin ? "My OT / Holiday Claims" : "Time Log Claims",
      employeeView && !fullAdmin
        ? "File overtime or holiday-hour claims against your completed time logs"
        : supervisorView
          ? "Review and approve claims for your department"
          : "Company-wide OT and holiday claims",
      actionEl.children.length ? actionEl : null
    ));

    if (supervisorView) {
      const scope = scopeBannerProps(db, account);
      if (scope) page.appendChild(buildScopeBanner(scope));
    } else if (fullAdmin) {
      page.appendChild(buildScopeBanner(scopeBannerProps(db, account)));
    } else if (employeeView) {
      page.appendChild(buildScopeBanner({
        variant: "personal",
        title: "Your claims only",
        detail: "Claims are filed against your own time logs and reviewed by a supervisor.",
      }));
    }

    const card = document.createElement("div");
    card.className = "card";

    const toolbar = document.createElement("div");
    toolbar.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px";

    const statusFilter = makeSelect(
      [["", "All Statuses"], ["Pending", "Pending"], ["Approved", "Approved"], ["Rejected", "Rejected"]],
      filterStatus
    );
    statusFilter.addEventListener("change", e => {
      filterStatus = e.target.value;
      renderTable(card);
    });
    toolbar.appendChild(statusFilter);
    card.appendChild(toolbar);

    renderTable(card);
    page.appendChild(card);
  }

  async function renderTable(card) {
    const old = card.querySelector(".table-wrap, .table-empty-wrap");
    if (old) old.remove();

    const params = new URLSearchParams();
    if (filterStatus === "Pending")  params.set("validation_status_id", "1");
    if (filterStatus === "Approved") params.set("validation_status_id", "2");
    if (filterStatus === "Rejected") params.set("validation_status_id", "3");

    let claims;
    try {
      claims = await fetchTimeLogClaims(params.toString());
    } catch (err) {
      card.appendChild(buildTable([], [], err.message || "Could not load claims."));
      return;
    }

    const headers = approverView
      ? ["Employee", "Work Date", "OT Hours", "Holiday Hrs", "Category", "Status", "Remarks", ""]
      : ["Work Date", "OT Hours", "Holiday Hrs", "Category", "Status", "Remarks", ""];

    const rows = claims.map(c => {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      if (approverView) {
        const viewBtn = document.createElement("button");
        viewBtn.className = "btn btn-ghost btn-sm";
        viewBtn.innerHTML = `${icons.eye} View`;
        viewBtn.addEventListener("click", () => openClaimDetailsModal(c));
        actions.appendChild(viewBtn);

        const isOwn = account.employee_id != null && c.employee_id === account.employee_id;
        if (c.validation_status === "Pending" && !isOwn) {
          const approveBtn = document.createElement("button");
          approveBtn.className = "btn btn-ghost btn-sm";
          approveBtn.style.color = "var(--emerald, #10b981)";
          approveBtn.textContent = "Approve";
          approveBtn.addEventListener("click", () => resolveClaim(c, 2));
          actions.appendChild(approveBtn);

          const rejectBtn = document.createElement("button");
          rejectBtn.className = "btn btn-ghost btn-sm";
          rejectBtn.style.color = "var(--red, #ef4444)";
          rejectBtn.textContent = "Reject";
          rejectBtn.addEventListener("click", () => resolveClaim(c, 3));
          actions.appendChild(rejectBtn);
        }
      } else if (c.validation_status === "Pending") {
        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-ghost btn-sm";
        editBtn.innerHTML = `${icons.pencil} Edit`;
        editBtn.addEventListener("click", () => openClaimModal(c));
        actions.appendChild(editBtn);

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-ghost btn-sm";
        cancelBtn.style.color = "var(--red, #ef4444)";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => cancelClaim(c));
        actions.appendChild(cancelBtn);
      }

      const base = [
        `<span class="mono text-xs">${fmtDate(c.work_date)}</span>`,
        `<span class="mono text-xs">${c.overtime_hours != null ? Number(c.overtime_hours).toFixed(2) + "h" : "—"}</span>`,
        `<span class="mono text-xs">${c.holiday_hours != null ? Number(c.holiday_hours).toFixed(2) + "h" : "—"}</span>`,
        `<span class="text-xs">${c.overtime_category_name || c.holiday_name || "—"}</span>`,
        badge(c.validation_status || "Pending"),
        `<span class="text-xs text-gray">${c.remarks || "—"}</span>`,
        actions,
      ];

      if (approverView) {
        const empCell = document.createElement("div");
        empCell.className = "emp-cell";
        empCell.innerHTML = `${avatarHTML(c.employee_name || "?", "sm")}<span class="text-sm">${c.employee_name || "?"}</span>`;
        return [empCell, ...base];
      }

      return base;
    });

    card.appendChild(buildTable(headers, rows, "No claims found."));
  }

  async function resolveClaim(claim, statusId) {
    const label = statusId === 2 ? "Approved" : "Rejected";
    const remarks = prompt(`Resolution remarks for ${label.toLowerCase()} claim (optional):`) || null;
    try {
      await updateTimeLogClaimRequest({
        claim_id: claim.claim_id,
        validation_status_id: statusId,
        resolution_remarks: remarks,
      });
      await reloadClaims();
      showToast(`Claim ${label.toLowerCase()}.`, "success");
      refresh();
    } catch (err) {
      showToast(err.message || "Could not update claim.", "error");
    }
  }

  function cancelClaim(claim) {
    openConfirmModal({
      title: "Cancel Claim",
      message: "Cancel this pending claim? This cannot be undone.",
      keepLabel: "Keep Claim",
      confirmLabel: "Cancel Claim",
      onConfirm: async () => {
        await deleteTimeLogClaimRequest(claim.claim_id);
        await reloadClaims();
        showToast("Claim cancelled.", "success");
        refresh();
      },
    });
  }

  function openClaimDetailsModal(claim) {
    const body = document.createElement("div");
    body.className = "detail-grid";
    body.style.gridTemplateColumns = "1fr 1fr";
    body.style.gap = "12px";

    [
      ["Employee", claim.employee_name || "—"],
      ["Work Date", fmtDate(claim.work_date)],
      ["Clock In", fmtTime(claim.clock_in)],
      ["Clock Out", claim.clock_out ? fmtTime(claim.clock_out) : "—"],
      ["Log Hours", claim.total_hours != null ? Number(claim.total_hours).toFixed(2) + "h" : "—"],
      ["OT Hours", claim.overtime_hours != null ? Number(claim.overtime_hours).toFixed(2) + "h" : "—"],
      ["Holiday Hours", claim.holiday_hours != null ? Number(claim.holiday_hours).toFixed(2) + "h" : "—"],
      ["Category", claim.overtime_category_name || "—"],
      ["Holiday", claim.holiday_name || "—"],
      ["Status", badge(claim.validation_status || "Pending")],
      ["Filed By", claim.claimed_by_username || "—"],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      item.innerHTML = `<div class="detail-item-label">${label}</div><div class="detail-item-value">${value}</div>`;
      body.appendChild(item);
    });

    const remarks = document.createElement("div");
    remarks.style.gridColumn = "1 / -1";
    remarks.innerHTML = `<div class="detail-item-label">Remarks</div><div class="detail-reason-box">${claim.remarks || "—"}</div>`;
    body.appendChild(remarks);

    if (claim.resolution_remarks) {
      const res = document.createElement("div");
      res.style.gridColumn = "1 / -1";
      res.innerHTML = `<div class="detail-item-label">Resolution</div><div class="detail-reason-box">${claim.resolution_remarks}</div>`;
      body.appendChild(res);
    }

    const { close } = openModal({ title: "Claim Details", body, wide: true });
    void close;
  }

  function openClaimModal(existing) {
    const isEdit = !!existing;
    const empId  = account.employee_id;

    const eligibleLogs = db.timeLogs.filter(l =>
      l.employee_id == empId &&
      l.clock_out &&
      l.total_hours != null &&
      Number(l.total_hours) > 0
    );

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:14px";

    const logOptions = eligibleLogs.map(l => [
      l.log_id,
      `${fmtDate(l.work_date || l.clock_in)} — ${Number(l.total_hours).toFixed(2)}h`,
    ]);

    const fLog = makeSelect(logOptions, isEdit ? existing.log_id : (logOptions[0] && logOptions[0][0]) || "");
    const otOpts = [["", "— None —"], ...(db.overtimeCategories || []).map(c => [c.overtime_category_id, c.category_name])];
    const holOpts = [["", "— None —"], ...(db.holidays || []).map(h => [h.holiday_id, `${h.holiday_name} (${h.holiday_date})`])];

    const fOtCat  = makeSelect(otOpts, isEdit ? (existing.overtime_category_id || "") : "");
    const fHol    = makeSelect(holOpts, isEdit ? (existing.holiday_id || "") : "");
    const fOtHrs  = makeInput("number", isEdit ? (existing.overtime_hours ?? "") : "");
    fOtHrs.step = "0.25";
    fOtHrs.min  = "0";
    const fHolHrs = makeInput("number", isEdit ? (existing.holiday_hours ?? "") : "");
    fHolHrs.step = "0.25";
    fHolHrs.min  = "0";
    const fRemarks = makeInput("text", isEdit ? (existing.remarks || "") : "", "Justification…");

    if (!isEdit) {
      body.appendChild(buildField("Time Log", fLog));
    }
    body.appendChild(buildField("Overtime Category", fOtCat));
    body.appendChild(buildField("Overtime Hours", fOtHrs));
    body.appendChild(buildField("Holiday", fHol));
    body.appendChild(buildField("Holiday Hours", fHolHrs));
    body.appendChild(buildField("Remarks", fRemarks));

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
    saveBtn.innerHTML = `${icons.check} ${isEdit ? "Save Changes" : "Submit Claim"}`;
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);

    const { close } = openModal({
      title: isEdit ? "Edit Claim" : "File OT / Holiday Claim",
      body,
      wide: true,
    });

    cancelBtn.addEventListener("click", close);

    saveBtn.addEventListener("click", async () => {
      const otHrs  = fOtHrs.value !== "" ? parseFloat(fOtHrs.value) : null;
      const holHrs = fHolHrs.value !== "" ? parseFloat(fHolHrs.value) : null;

      if ((!otHrs || otHrs <= 0) && (!holHrs || holHrs <= 0)) {
        errEl.textContent = "Enter overtime hours and/or holiday hours.";
        errEl.style.display = "block";
        return;
      }

      const payload = {
        overtime_category_id: fOtCat.value ? Number(fOtCat.value) : null,
        holiday_id:           fHol.value ? Number(fHol.value) : null,
        overtime_hours:       otHrs,
        holiday_hours:        holHrs,
        remarks:              fRemarks.value.trim() || null,
      };

      if (isEdit) {
        payload.claim_id = existing.claim_id;
      } else {
        if (!fLog.value) {
          errEl.textContent = "Select a time log.";
          errEl.style.display = "block";
          return;
        }
        payload.log_id = Number(fLog.value);
      }

      errEl.style.display = "none";
      saveBtn.disabled = true;

      try {
        if (isEdit) {
          await updateTimeLogClaimRequest(payload);
        } else {
          await createTimeLogClaimRequest(payload);
        }
        await reloadClaims();
        close();
        showToast(isEdit ? "Claim updated." : "Claim submitted.", "success");
        refresh();
      } catch (err) {
        errEl.textContent = err.message || "Could not save claim.";
        errEl.style.display = "block";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  render();
  return page;
}
