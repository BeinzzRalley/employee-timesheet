function renderWorkSchedules(db, onDbChange) {
  const page = document.createElement("div");
  page.className = "page";

  function refresh() {
    page.innerHTML = "";
    render();
  }

  async function reloadSchedules() {
    try {
      db.workSchedules = await apiRequest("/work_schedules.php");
      onDbChange(db);
    } catch (err) {
      showToast(err.message || "Could not reload work schedules.", "error");
    }
  }

  function render() {
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.innerHTML = `${icons.plus} Add Schedule`;
    addBtn.addEventListener("click", () => openScheduleModal(null));

    page.appendChild(pageHeader(
      "Work Schedules",
      `${(db.workSchedules || []).length} schedules`,
      addBtn
    ));

    const card = document.createElement("div");
    card.className = "card";

    const rows = (db.workSchedules || []).map(s => {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm";
      editBtn.innerHTML = `${icons.pencil} Edit`;
      editBtn.addEventListener("click", () => openScheduleModal(s));

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm";
      delBtn.style.color = "var(--red, #ef4444)";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteSchedule(s));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      return [
        `<span class="font-medium text-sm">${s.schedule_name}</span>`,
        `<span class="mono text-xs">${s.start_time || "—"}</span>`,
        `<span class="mono text-xs">${s.end_time   || "—"}</span>`,
        actions,
      ];
    });

    card.appendChild(buildTable(
      ["Schedule Name", "Start Time", "End Time", ""],
      rows,
      "No work schedules defined."
    ));
    page.appendChild(card);
  }

  function deleteSchedule(s) {
    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "18px";

    const message = document.createElement("p");
    message.className = "text-sm";
    message.textContent = `Are you sure you want to delete "${s.schedule_name}"?`;
    body.appendChild(message);

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const keepBtn = document.createElement("button");
    keepBtn.className = "btn btn-outline";
    keepBtn.textContent = "Keep Schedule";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete Schedule";

    footer.appendChild(keepBtn);
    footer.appendChild(deleteBtn);
    body.appendChild(footer);

    const { close } = openModal({ title: "Delete Work Schedule", body });

    keepBtn.addEventListener("click", close);

    deleteBtn.addEventListener("click", async () => {
      deleteBtn.disabled = true;
      try {
        await apiRequest(`/work_schedules.php?id=${s.schedule_id}`, { method: "DELETE" });
        await reloadSchedules();
        close();
        showToast("Work schedule deleted.", "success");
        refresh();
      } catch (err) {
        showToast(err.message || "Could not delete schedule.", "error");
        deleteBtn.disabled = false;
      }
    });
  }

  function openScheduleModal(existing) {
    const isEdit = !!existing;
    const data = isEdit ? { ...existing } : { schedule_name: "", start_time: "", end_time: "" };

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:14px";

    const fName  = makeInput("text", data.schedule_name, "e.g. Morning Shift");
    const fStart = makeInput("time", data.start_time || "");
    const fEnd   = makeInput("time", data.end_time   || "");

    const grid = document.createElement("div");
    grid.className = "grid-2";
    grid.style.gap = "14px";
    grid.appendChild(buildField("Start Time", fStart));
    grid.appendChild(buildField("End Time",   fEnd));

    body.appendChild(buildField("Schedule Name", fName));
    body.appendChild(grid);

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
    saveBtn.innerHTML = `${icons.check} ${isEdit ? "Save Changes" : "Add Schedule"}`;
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);

    const { close } = openModal({
      title: isEdit ? "Edit Work Schedule" : "Add Work Schedule",
      body,
    });

    cancelBtn.addEventListener("click", close);

    saveBtn.addEventListener("click", async () => {
      const name  = fName.value.trim();
      const start = fStart.value;
      const end   = fEnd.value;

      if (!name) {
        errEl.textContent = "Schedule name is required.";
        errEl.style.display = "block";
        return;
      }
      if (!start) {
        errEl.textContent = "Start time is required.";
        errEl.style.display = "block";
        return;
      }
      if (!end) {
        errEl.textContent = "End time is required.";
        errEl.style.display = "block";
        return;
      }

      const payload = { schedule_name: name, start_time: start, end_time: end };
      if (isEdit) payload.schedule_id = data.schedule_id;

      errEl.style.display = "none";
      saveBtn.disabled = true;

      try {
        await apiRequest("/work_schedules.php", {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        await reloadSchedules();
        close();
        showToast(isEdit ? "Schedule updated." : "Schedule added.", "success");
        refresh();
      } catch (err) {
        errEl.textContent = err.message || "Could not save schedule.";
        errEl.style.display = "block";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  render();
  return page;
}