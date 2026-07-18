function renderValidationStatus(db, onDbChange) {
  const page = document.createElement("div");
  page.className = "page";

  function refresh() {
    page.innerHTML = "";
    render();
  }

  async function reloadStatuses() {
    try {
      db.validationStatuses = await apiRequest("/validation_status.php");
      onDbChange(db);
    } catch (err) {
      showToast(err.message || "Could not reload validation statuses.", "error");
    }
  }

  function render() {
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.innerHTML = `${icons.plus} Add Status`;
    addBtn.addEventListener("click", () => openStatusModal(null));

    page.appendChild(pageHeader(
      "Validation Status",
      `${(db.validationStatuses || []).length} statuses`,
      addBtn
    ));

    const card = document.createElement("div");
    card.className = "card";

    const rows = (db.validationStatuses || []).map(s => {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm";
      editBtn.innerHTML = `${icons.pencil} Edit`;
      editBtn.addEventListener("click", () => openStatusModal(s));

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm";
      delBtn.style.color = "var(--red, #ef4444)";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteStatus(s));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      return [
        `<span class="font-medium text-sm">${s.status_name}</span>`,
        actions,
      ];
    });

    card.appendChild(buildTable(
      ["Status Name", ""],
      rows,
      "No validation statuses defined."
    ));
    page.appendChild(card);
  }

  function deleteStatus(s) {
    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "18px";

    const message = document.createElement("p");
    message.className = "text-sm";
    message.textContent = `Are you sure you want to delete "${s.status_name}"?`;
    body.appendChild(message);

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const keepBtn = document.createElement("button");
    keepBtn.className = "btn btn-outline";
    keepBtn.textContent = "Keep Status";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete Status";

    footer.appendChild(keepBtn);
    footer.appendChild(deleteBtn);
    body.appendChild(footer);

    const { close } = openModal({ title: "Delete Validation Status", body });

    keepBtn.addEventListener("click", close);

    deleteBtn.addEventListener("click", async () => {
      deleteBtn.disabled = true;
      try {
        await apiRequest(`/validation_status.php?id=${s.validation_status_id}`, { method: "DELETE" });
        await reloadStatuses();
        close();
        showToast("Validation status deleted.", "success");
        refresh();
      } catch (err) {
        showToast(err.message || "Could not delete status.", "error");
        deleteBtn.disabled = false;
      }
    });
  }

  function openStatusModal(existing) {
    const isEdit = !!existing;
    const data = isEdit ? { ...existing } : { status_name: "" };

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:14px";

    const fName = makeInput("text", data.status_name, "e.g. Pending");
    body.appendChild(buildField("Status Name", fName));

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
    saveBtn.innerHTML = `${icons.check} ${isEdit ? "Save Changes" : "Add Status"}`;
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);

    const { close } = openModal({
      title: isEdit ? "Edit Validation Status" : "Add Validation Status",
      body,
    });

    cancelBtn.addEventListener("click", close);

    saveBtn.addEventListener("click", async () => {
      const name = fName.value.trim();
      if (!name) {
        errEl.textContent = "Status name is required.";
        errEl.style.display = "block";
        return;
      }

      const payload = { status_name: name };
      if (isEdit) payload.validation_status_id = data.validation_status_id;

      errEl.style.display = "none";
      saveBtn.disabled = true;

      try {
        await apiRequest("/validation_status.php", {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        await reloadStatuses();
        close();
        showToast(isEdit ? "Status updated." : "Status added.", "success");
        refresh();
      } catch (err) {
        errEl.textContent = err.message || "Could not save status.";
        errEl.style.display = "block";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  render();
  return page;
}