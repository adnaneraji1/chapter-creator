const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3Existing = document.getElementById("step3-existing");
const step3New = document.getElementById("step3-new");

const chapterInput = document.getElementById("chapter");
const worksSelect = document.getElementById("works");
const newWorkInput = document.getElementById("newWork");

const btnYes = document.getElementById("btnYes");
const btnNo = document.getElementById("btnNo");
const updateBtn = document.getElementById("updateBtn");
const updateDot = document.getElementById("updateDot");
const loadingOverlay = document.getElementById("loadingOverlay");
const messageBox = document.getElementById("message");
const resetBtn = document.getElementById("resetBtn");
const modeIndicator = document.getElementById("modeIndicator");
const themeBtn = document.getElementById("themeBtn");

const navItems = document.querySelectorAll(".nav-item");
const viewPanels = document.querySelectorAll(".view-panel");

const previewWork = document.getElementById("previewWork");
const previewChapter = document.getElementById("previewChapter");
const previewMode = document.getElementById("previewMode");
const previewTree = document.getElementById("previewTree");

const activityList = document.getElementById("activityList");
const activityCount = document.getElementById("activityCount");

const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");

const setupModal = document.getElementById("setupModal");
const baseDirInput = document.getElementById("baseDirInput");
const saveBaseDir = document.getElementById("saveBaseDir");
const setupMessage = document.getElementById("setupMessage");

let selectedMode = null;
let deleteTargetPath = null;
let currentUiVersion = null;

function showStep(stepElement) {
    [step1, step2, step3Existing, step3New].forEach(step => {
        step.classList.remove("active");
    });
    stepElement.classList.add("active");
}

function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
}

function normalizeWorkName(name) {
    return name.trim().replace(/\s+/g, "-");
}

function showLoading() {
    loadingOverlay.classList.remove("hidden");
}

function reloadApp() {
    if (updateBtn.disabled) return;

    showLoading();
    setTimeout(() => {
        location.reload();
    }, 850);
}

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("chapter-theme", isDark ? "dark" : "light");
}

function switchView(viewId) {
    navItems.forEach(item => {
        item.classList.toggle("active", item.dataset.view === viewId);
    });

    viewPanels.forEach(panel => {
        panel.classList.toggle("active-view", panel.id === viewId);
    });
}

function getCurrentWorkName() {
    if (selectedMode === "existing") {
        return worksSelect.value || "";
    }
    if (selectedMode === "new") {
        return normalizeWorkName(newWorkInput.value || "");
    }
    return "";
}

function getCurrentChapter() {
    const value = chapterInput.value.trim();
    if (value === "") return "";
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0 || num > 999) return "";
    return String(num);
}

function renderPreview() {
    const work = getCurrentWorkName();
    const chapter = getCurrentChapter();
    const mode = selectedMode || "idle";

    previewWork.textContent = work || "—";
    previewChapter.textContent = chapter || "—";
    previewMode.textContent =
        mode === "existing" ? "Existing Work" :
            mode === "new" ? "New Work" : "—";

    if (!work || !chapter || !selectedMode) {
        previewTree.innerHTML = `<div class="tree-empty">Fill the form in Create Chapter to generate a live preview.</div>`;
        return;
    }

    previewTree.innerHTML = `
    <div class="tree-node root">${work}</div>
    <div class="tree-children">
      <div class="tree-node">${chapter}</div>
      <div class="tree-children">
        <div class="tree-node">الفصل</div>
        <div class="tree-node">التحرير</div>
        <div class="tree-node">التسليم</div>
      </div>
    </div>
  `;
}

function setUpdateState(hasUpdate) {
    if (hasUpdate) {
        updateBtn.disabled = false;
        updateBtn.title = "Update available";
        updateDot.classList.remove("up-to-date");
        updateDot.classList.add("has-update");
        updateBtn.style.cursor = "pointer";
    } else {
        updateBtn.disabled = true;
        updateBtn.title = "Already up to date";
        updateDot.classList.remove("has-update");
        updateDot.classList.add("up-to-date");
        updateBtn.style.cursor = "not-allowed";
    }
}

async function fetchUiVersion() {
    const res = await fetch(`/ui_status?_=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    return data.version;
}

async function initUiVersionWatcher() {
    try {
        currentUiVersion = await fetchUiVersion();
        setUpdateState(false);

        setInterval(async () => {
            try {
                const latestVersion = await fetchUiVersion();
                setUpdateState(latestVersion !== currentUiVersion);
            } catch {
                // ignore silently
            }
        }, 1500);
    } catch {
        setUpdateState(false);
    }
}

async function loadWorks() {
    try {
        const res = await fetch("/get_works");
        const data = await res.json();

        worksSelect.innerHTML = `<option value="" selected disabled>Select a work</option>`;

        data.forEach(work => {
            const option = document.createElement("option");
            option.value = work;
            option.textContent = work;
            worksSelect.appendChild(option);
        });

        renderPreview();
    } catch {
        showMessage("Failed to load works.", "error");
    }
}

async function openFolder(path) {
    try {
        const res = await fetch("/open_folder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ path })
        });

        const result = await res.json();

        if (!res.ok) {
            showMessage(result.error || "Failed to open folder.", "error");
        }
    } catch {
        showMessage("Failed to open folder.", "error");
    }
}

function deleteActivity(path) {
    deleteTargetPath = path;
    deleteModal.classList.remove("hidden");
}

async function confirmDelete() {
    if (!deleteTargetPath) return;

    try {
        const res = await fetch("/delete_activity", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ path: deleteTargetPath })
        });

        const result = await res.json();

        if (!res.ok) {
            showMessage(result.error || "Failed to delete activity.", "error");
            return;
        }

        deleteModal.classList.add("hidden");
        deleteTargetPath = null;

        await loadRecentActivity();
    } catch {
        showMessage("Failed to delete activity.", "error");
    }
}

function cancelDelete() {
    deleteModal.classList.add("hidden");
    deleteTargetPath = null;
}

async function loadRecentActivity() {
    try {
        const res = await fetch("/recent");
        const data = await res.json();

        activityCount.textContent = `${data.length} item${data.length === 1 ? "" : "s"}`;

        if (!data.length) {
            activityList.innerHTML = `<div class="activity-empty">No activity yet.</div>`;
            return;
        }

        activityList.innerHTML = data.map(item => `
      <article class="activity-card">
        <div class="activity-top">
          <div class="activity-work">${item.work}</div>
          <div class="activity-mode">${item.mode}</div>
        </div>
        <div class="activity-chapter">Chapter ${item.chapter}</div>
        <div class="activity-path">${item.path}</div>
        <div class="activity-time">${item.created_at}</div>

        <div class="activity-actions">
          <button class="mini-btn open-btn" data-path="${item.path}">Open Folder</button>
          <button class="mini-btn delete-btn" data-path="${item.path}">Delete</button>
        </div>
      </article>
    `).join("");

        document.querySelectorAll(".open-btn").forEach(btn => {
            btn.addEventListener("click", () => openFolder(btn.dataset.path));
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => deleteActivity(btn.dataset.path));
        });
    } catch {
        activityList.innerHTML = `<div class="activity-empty">Failed to load activity.</div>`;
    }
}

async function createChapter() {
    const chapterRaw = chapterInput.value.trim();

    if (chapterRaw === "") {
        showMessage("Enter a chapter number first.", "error");
        showStep(step1);
        chapterInput.focus();
        return;
    }

    let work = "";
    let mode = "";

    if (selectedMode === "existing") {
        if (!worksSelect.value) {
            showMessage("Select an existing work.", "error");
            worksSelect.focus();
            return;
        }
        work = worksSelect.value;
        mode = "existing";
    } else if (selectedMode === "new") {
        const cleanedName = normalizeWorkName(newWorkInput.value);
        if (!cleanedName) {
            showMessage("Enter a new work name.", "error");
            newWorkInput.focus();
            return;
        }
        work = cleanedName;
        newWorkInput.value = cleanedName;
        mode = "new";
    } else {
        showMessage("Choose whether the work is new or existing.", "error");
        showStep(step2);
        return;
    }

    try {
        const res = await fetch("/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chapter: chapterRaw,
                work: work,
                mode: mode
            })
        });

        const result = await res.json();

        if (!res.ok) {
            showMessage(result.error || "Something went wrong.", "error");
            return;
        }

        showMessage(`Created successfully: ${result.success}`, "success");
        resetBtn.style.display = "block";
        modeIndicator.textContent = selectedMode === "new" ? "New Work" : "Existing Work";

        await loadRecentActivity();
        renderPreview();
    } catch {
        showMessage("Failed to connect to server.", "error");
    }
}

function resetApp() {
    chapterInput.value = "";
    newWorkInput.value = "";
    worksSelect.innerHTML = `<option value="" selected disabled>Select a work</option>`;
    selectedMode = null;
    showMessage("", "");
    showStep(step1);
    resetBtn.style.display = "none";
    modeIndicator.textContent = "Idle";
    renderPreview();
    chapterInput.focus();
}

async function checkConfig() {
    try {
        const res = await fetch("/config", { cache: "no-store" });
        const data = await res.json();

        if (!data.configured) {
            setupModal.classList.remove("hidden");
        } else {
            setupModal.classList.add("hidden");
        }
    } catch {
        setupModal.classList.remove("hidden");
    }
}

async function saveWorkspaceFolder() {
    const baseDir = baseDirInput.value.trim();

    if (!baseDir) {
        setupMessage.textContent = "Enter a folder path.";
        setupMessage.className = "message error";
        return;
    }

    try {
        const res = await fetch("/set_base_dir", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ base_dir: baseDir })
        });

        const result = await res.json();

        if (!res.ok) {
            setupMessage.textContent = result.error || "Invalid folder.";
            setupMessage.className = "message error";
            return;
        }

        setupMessage.textContent = "Workspace saved.";
        setupMessage.className = "message success";

        setTimeout(() => {
            location.reload();
        }, 500);
    } catch {
        setupMessage.textContent = "Failed to save workspace.";
        setupMessage.className = "message error";
    }
}

saveBaseDir.addEventListener("click", saveWorkspaceFolder);

chapterInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();

        const value = chapterInput.value.trim();
        const num = Number(value);

        if (value === "" || !Number.isInteger(num) || num < 0 || num > 999) {
            showMessage("Chapter must be a number from 0 to 999.", "error");
            return;
        }

        showMessage("", "");
        showStep(step2);
        modeIndicator.textContent = "Selecting Mode";
        renderPreview();
    }
});

chapterInput.addEventListener("input", renderPreview);
newWorkInput.addEventListener("input", renderPreview);
worksSelect.addEventListener("change", renderPreview);

btnNo.addEventListener("click", async function () {
    selectedMode = "existing";
    showMessage("", "");
    showStep(step3Existing);
    modeIndicator.textContent = "Existing Work";
    await loadWorks();
    worksSelect.focus();
    renderPreview();
});

btnYes.addEventListener("click", function () {
    selectedMode = "new";
    showMessage("", "");
    showStep(step3New);
    modeIndicator.textContent = "New Work";
    newWorkInput.focus();
    renderPreview();
});

worksSelect.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        createChapter();
    }
});

newWorkInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        newWorkInput.value = normalizeWorkName(newWorkInput.value);
        renderPreview();
        createChapter();
    }
});

updateBtn.addEventListener("click", reloadApp);
resetBtn.addEventListener("click", resetApp);
themeBtn.addEventListener("click", toggleTheme);
confirmDeleteBtn.addEventListener("click", confirmDelete);
cancelDeleteBtn.addEventListener("click", cancelDelete);

navItems.forEach(item => {
    item.addEventListener("click", () => {
        switchView(item.dataset.view);

        if (item.dataset.view === "activityView") {
            loadRecentActivity();
        }

        if (item.dataset.view === "previewView") {
            renderPreview();
        }
    });
});

const savedTheme = localStorage.getItem("chapter-theme");

if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
} else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const savedTheme = localStorage.getItem("chapter-theme");

    if (!savedTheme) {
        applyTheme(e.matches ? "dark" : "light");
    }
});

loadRecentActivity();
renderPreview();
initUiVersionWatcher();
checkConfig();
chapterInput.focus();