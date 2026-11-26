
    (() => {
      const API = `${(window.SFIC_API_BASE_URL || "").replace(/\/$/, "")}/api/admin`;

      const $ = (id) => document.getElementById(id);

      const tableBody = $("complaintsTableBody");
      const message = $("complaintsMessage");
      const modal = $("complaintDetailsModal");

      if (!tableBody || !modal) return;

      let currentPage = 1;
      let totalPages = 1;
      let currentComplaintId = null;
      let searchTimer = null;
      let complaintRequest = 0;
      let modalTrigger = null;
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Complaint details");
      modal.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          $("closeComplaintModal").click();
        }
        if (event.key === "Tab") {
          const controls = [...modal.querySelectorAll("button, select, textarea")].filter(el => !el.disabled);
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });

      function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);
      }

      function authHeaders(extra = {}) {
        const token = sessionStorage.getItem("sfic_admin_token");

        if (!token) {
          window.location.replace("/admin/login.html");
          throw new Error("Admin session expired.");
        }

        return {
          ...extra,
          Authorization: `Bearer ${token}`
        };
      }

      async function apiRequest(path, options = {}) {
        const response = await fetch(`${API}${path}`, {
          ...options,
          headers: authHeaders(options.headers || {})
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("sfic_admin_token");
          sessionStorage.removeItem("sfic_admin");
          window.location.replace("/admin/login.html");
          throw new Error("Admin session expired.");
        }

        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Request failed.");
        }

        return data;
      }

      function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
          ? "—"
          : date.toLocaleString("en-IN");
      }

      async function loadComplaints() {
        const requestVersion = ++complaintRequest;
        $("complaintsPrevious").disabled = true;
        $("complaintsNext").disabled = true;
        message.textContent = "Loading complaint drafts...";
        tableBody.replaceChildren();

        const search = $("complaintSearch").value.trim();
        const status = $("complaintStatusFilter").value;

        const params = new URLSearchParams({
          page: currentPage,
          limit: 10,
          search,
          status
        });

        try {
          const data = await apiRequest(`/complaints?${params}`);
          if (requestVersion !== complaintRequest) return;

          const drafts = data.complaint_drafts || [];
          const pagination = data.pagination;

          totalPages = Math.max(1, pagination.total_pages || 1);

          if (!drafts.length) {
            message.textContent = "No complaint drafts found.";
          } else {
            message.textContent = `${pagination.total} complaint draft(s) found.`;

            drafts.forEach(draft => {
              const row = document.createElement("tr");
              row.className = "border-b border-border-hairline";

              const cells = [
                draft.id,
                draft.platform || "—",
                draft.incident_description || "—",
                draft.amount == null ? "—" : `₹${draft.amount}`,
                draft.risk_level || "Not available",
                draft.status || "Pending",
                formatDate(draft.created_at)
              ];

              cells.forEach(value => {
                const cell = document.createElement("td");
                cell.className = "p-3";
                cell.textContent = value;
                if (row.children.length === 2) cell.classList.add("incident-preview");
                if ([4, 5].includes(row.children.length)) {
                  const badge = document.createElement("span");
                  badge.className = "admin-badge";
                  badge.dataset.level = String(value).toLowerCase().replace(/ /g, "-");
                  badge.textContent = value;
                  cell.replaceChildren(badge);
                }
                row.appendChild(cell);
              });

              const actionCell = document.createElement("td");
              actionCell.className = "p-3";

              const viewButton = document.createElement("button");
              viewButton.type = "button";
              viewButton.textContent = "View";
              viewButton.setAttribute("aria-label", `View complaint ${draft.id}`);
              viewButton.className =
                "px-3 py-2 rounded-lg bg-primary-container text-on-primary-container";

              viewButton.addEventListener("click", () => {
                openComplaint(draft.id);
              });

              actionCell.appendChild(viewButton);
              row.appendChild(actionCell);
              tableBody.appendChild(row);
            });
          }

          $("complaintsPaginationInfo").textContent =
            `Page ${pagination.page} of ${totalPages} · ${pagination.total} total`;

          $("complaintsPrevious").disabled = currentPage <= 1;
          $("complaintsNext").disabled = currentPage >= totalPages;

        } catch (error) {
          if (requestVersion === complaintRequest) {
            message.textContent = error.message;
            $("complaintsPaginationInfo").textContent = "Complaint list unavailable";
          }
        }
      }

      async function openComplaint(id) {
        currentComplaintId = id;
        if (modal.classList.contains("hidden")) modalTrigger = document.activeElement;
        $("saveComplaintStatus").disabled = true;
        modal.classList.remove("hidden");
        $("closeComplaintModal").focus();
        $("complaintDetailsContent").textContent = "Loading details...";
        $("complaintHistoryContent").textContent = "Loading history...";
        $("complaintUpdateMessage").textContent = "";

        try {
          const [detailData, historyData] = await Promise.all([
            apiRequest(`/complaints/${id}`),
            apiRequest(`/complaints/${id}/history`)
          ]);

          if (currentComplaintId !== id) return;
          const complaint = detailData.complaint;
          const details = $("complaintDetailsContent");

          details.replaceChildren();

          const fields = [
            ["Complaint ID", complaint.id],
            ["Platform", complaint.platform],
            ["Incident Description", complaint.incident_description],
            ["Incident Date", formatDate(complaint.incident_date)],
            ["Amount", complaint.amount == null ? "—" : `₹${complaint.amount}`],
            ["Transaction ID", complaint.transaction_id],
            ["Suspect Details", complaint.suspect_details],
            ["Scan Type", complaint.scan_type],
            ["Risk Level", complaint.risk_level],
            ["Risk Score", complaint.risk_score],
            ["Complaint Draft", complaint.complaint_text],
            ["Current Status", complaint.status],
            ["Admin Notes", complaint.admin_notes]
          ];

          fields.forEach(([label, value]) => {
            const block = document.createElement("div");
            block.className = "border-b border-border-hairline pb-2";

            const heading = document.createElement("strong");
            heading.textContent = label;

            const content = document.createElement("p");
            content.className = "mt-1 whitespace-pre-wrap";
            content.textContent = value ?? "—";

            block.append(heading, content);
            details.appendChild(block);
          });

          $("complaintNewStatus").value =
            complaint.status || "Pending";

          $("complaintAdminNotes").value =
            complaint.admin_notes || "";

          const historyContainer = $("complaintHistoryContent");
          historyContainer.replaceChildren();

          $("saveComplaintStatus").disabled = false;
          const history = historyData.history || [];

          if (!history.length) {
            historyContainer.textContent = "No status changes recorded.";
          } else {
            history.forEach(item => {
              const entry = document.createElement("div");
              entry.className = "border-b border-border-hairline pb-2";

              const status = document.createElement("p");
              status.textContent =
                `${item.previous_status || "New"} → ${item.new_status}`;

              const admin = document.createElement("p");
              admin.textContent =
                `Updated by: ${item.admin_name || "Unknown admin"}`;

              const date = document.createElement("p");
              date.textContent = formatDate(item.changed_at);

              const notes = document.createElement("p");
              notes.textContent = item.admin_notes || "No notes";

              entry.append(status, admin, date, notes);
              historyContainer.appendChild(entry);
            });
          }

        } catch (error) {
          if (currentComplaintId !== id) return;
          $("complaintDetailsContent").textContent = error.message;
          $("complaintHistoryContent").textContent =
            "Unable to load status history.";
        }
      }

      async function saveComplaintStatus() {
        if (!currentComplaintId) return;

        const button = $("saveComplaintStatus");
        const result = $("complaintUpdateMessage");

        button.disabled = true;
        result.textContent = "Saving...";

        try {
          const data = await apiRequest(
            `/complaints/${currentComplaintId}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: $("complaintNewStatus").value,
                adminNotes: $("complaintAdminNotes").value
              })
            }
          );

          result.textContent =
            `Updated successfully. Status: ${data.complaint.status}`;

          await loadComplaints();
          await openComplaint(currentComplaintId);
          document.dispatchEvent(new Event("admin:complaint-updated"));
          result.textContent = `Saved successfully. Status: ${data.complaint.status}`;

        } catch (error) {
          result.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      }

      $("complaintSearch").addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
          currentPage = 1;
          loadComplaints();
        }, 350);
      });

      $("complaintStatusFilter").addEventListener("change", () => {
        currentPage = 1;
        loadComplaints();
      });

      $("refreshComplaints").addEventListener("click", loadComplaints);

      $("complaintsPrevious").addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          loadComplaints();
        }
      });

      $("complaintsNext").addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadComplaints();
        }
      });

      $("closeComplaintModal").addEventListener("click", () => {
        modal.classList.add("hidden");
        currentComplaintId = null;
        modalTrigger?.focus();
      });

      modal.addEventListener("click", event => {
        if (event.target === modal) {
          modal.classList.add("hidden");
          currentComplaintId = null;
        }
      });

      $("saveComplaintStatus").addEventListener(
        "click",
        saveComplaintStatus
      );

      const initial = new URLSearchParams(location.search);
      if (initial.has("status")) $("complaintStatusFilter").value = initial.get("status");
      loadComplaints();
      if (/^[1-9]\d*$/.test(initial.get("id") || "")) openComplaint(initial.get("id"));
    })();
  