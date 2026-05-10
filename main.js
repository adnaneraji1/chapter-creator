const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 900,
        minHeight: 600,
        autoHideMenuBar: true,
        title: "Chapter Creator",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadURL("http://127.0.0.1:5000");

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

function startFlaskServer() {
    const pythonExe = "pythonw";
    const serverFile = path.join(__dirname, "server.py");

    serverProcess = spawn(pythonExe, [serverFile], {
        cwd: __dirname,
        windowsHide: true,
        shell: false,
        detached: false
    });

    serverProcess.on("error", (err) => {
        console.error("Failed to start Python server:", err);
    });

    if (serverProcess.stdout) {
        serverProcess.stdout.on("data", (data) => {
            console.log(data.toString());
        });
    }

    if (serverProcess.stderr) {
        serverProcess.stderr.on("data", (data) => {
            console.error(data.toString());
        });
    }
}

app.whenReady().then(() => {
    startFlaskServer();

    setTimeout(() => {
        createWindow();
    }, 3000);

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", function () {
    if (serverProcess && !serverProcess.killed) {
        try {
            serverProcess.kill();
        } catch (e) { }
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    if (serverProcess && !serverProcess.killed) {
        try {
            serverProcess.kill();
        } catch (e) { }
    }
});