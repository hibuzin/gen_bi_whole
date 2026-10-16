import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import treeKill from "tree-kill";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let mainWindow;
let backendProcess;


const THERMAL_PRINTER_NAMES = [
  "RP3160 GOLD(U) 1",
  "POS-58(copy of 5)",
];

ipcMain.handle("print-receipt", async (event) => {
  console.log("\n");
  console.log("==========================================");
  console.log("[PRINT] PRINT REQUEST RECEIVED");
  console.log("[PRINT] Time:", new Date().toISOString());
  console.log("==========================================");

  try {
    // -------------------------------------------------
    // 1. CHECK WINDOW
    // -------------------------------------------------

    console.log("[PRINT] Step 1: Checking mainWindow...");

    console.log("[PRINT] mainWindow exists:", !!mainWindow);

    if (mainWindow) {
      console.log(
        "[PRINT] mainWindow destroyed:",
        mainWindow.isDestroyed()
      );
    }

    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error("Main window is not available");
    }

    console.log("[PRINT] Step 1 SUCCESS");


    // -------------------------------------------------
    // 2. CHECK IPC SENDER
    // -------------------------------------------------

    console.log("[PRINT] Step 2: Checking IPC sender...");

    console.log(
      "[PRINT] Sender URL:",
      event.sender.getURL()
    );

    console.log("[PRINT] Step 2 SUCCESS");


    // -------------------------------------------------
    // 3. FIND INSTALLED PRINTERS
    // -------------------------------------------------

    console.log("[PRINT] Step 3: Getting printers...");

    console.log(
      "[PRINT] Target printer:",
      THERMAL_PRINTER_NAMES
    );

    const printers =
      await mainWindow.webContents.getPrintersAsync();

    console.log(
      "[PRINT] Number of printers found:",
      printers.length
    );

    console.log("[PRINT] ===== AVAILABLE PRINTERS =====");

    printers.forEach((printer, index) => {
      console.log(`[PRINT] Printer ${index + 1}:`);
      console.log("   name:", printer.name);
      console.log("   displayName:", printer.displayName);
      console.log("   description:", printer.description);
      console.log("   status:", printer.status);
      console.log("   isDefault:", printer.isDefault);
      console.log("------------------------------------");
    });

    console.log("[PRINT] =============================");


    // -------------------------------------------------
    // 4. FIND RP3160
    // -------------------------------------------------

    console.log(
      "[PRINT] Step 4: Searching preferred printers:",
      THERMAL_PRINTER_NAMES
    );

    let printer = null;

    // Priority:
    // 1. RP3160 GOLD(U) 1
    // 2. POS-58(copy of 5)
    for (const preferredName of THERMAL_PRINTER_NAMES) {

      console.log(
        "[PRINT] Looking for:",
        preferredName
      );

      printer = printers.find(
        (p) =>
          p.name === preferredName ||
          p.displayName === preferredName
      );

      if (printer) {

        console.log(
          "[PRINT] Found preferred printer:",
          preferredName
        );

        break;
      }

      console.warn(
        "[PRINT] Printer not available:",
        preferredName
      );
    }

    if (!printer) {

      console.error(
        "[PRINT] ❌ NONE OF THE PREFERRED PRINTERS FOUND"
      );

      console.error(
        "[PRINT] Expected one of:",
        THERMAL_PRINTER_NAMES
      );

      console.error(
        "[PRINT] Available printer names:",
        printers.map((p) => p.name)
      );

      throw new Error(
        `Thermal printer not found. Tried: ${THERMAL_PRINTER_NAMES.join(", ")}`
      );
    }

    console.log("[PRINT] Step 4 SUCCESS");

    console.log("[PRINT] Selected printer:");
    console.log("[PRINT] name:", printer.name);
    console.log(
      "[PRINT] displayName:",
      printer.displayName
    );
    console.log("[PRINT] status:", printer.status);


    // -------------------------------------------------
    // 5. CHECK PAGE
    // -------------------------------------------------

    console.log("[PRINT] Step 5: Checking page...");

    console.log(
      "[PRINT] Current page:",
      mainWindow.webContents.getURL()
    );

    console.log(
      "[PRINT] Is loading:",
      mainWindow.webContents.isLoading()
    );

    console.log("[PRINT] Step 5 SUCCESS");


    // -------------------------------------------------
    // 6. SEND PRINT
    // -------------------------------------------------

    console.log("[PRINT] Step 6: Calling webContents.print()");

    console.log("[PRINT] Print options:", {
      silent: true,
      deviceName: printer.name,
      printBackground: true,
      margins: {
        marginType: "none",
      },
    });

    return await new Promise((resolve, reject) => {

      console.log(
        "[PRINT] Sending job to Windows printer..."
      );

      mainWindow.webContents.print(
        {
          silent: true,
          deviceName: printer.name,
          printBackground: true,

          margins: {
            marginType: "none",
          },
        },

        (success, failureReason) => {

          console.log(
            "[PRINT] webContents.print callback fired"
          );

          console.log(
            "[PRINT] success:",
            success
          );

          console.log(
            "[PRINT] failureReason:",
            failureReason
          );

          if (!success) {

            console.error(
              "[PRINT] ❌ PRINT FAILED"
            );

            console.error(
              "[PRINT] Reason:",
              failureReason
            );

            reject(
              new Error(
                failureReason ||
                "Electron webContents.print failed"
              )
            );

            return;
          }

          console.log(
            "[PRINT] ✅ PRINT SUCCESS"
          );

          console.log(
            "[PRINT] Printer:",
            printer.name
          );

          console.log(
            "=========================================="
          );

          resolve({
            success: true,
            printer: printer.name,
          });
        }
      );
    });

  } catch (error) {

    console.error("");
    console.error("==========================================");
    console.error("[PRINT] ❌ PRINT EXCEPTION");
    console.error("[PRINT] Message:", error?.message);
    console.error("[PRINT] Stack:", error?.stack);
    console.error("==========================================");

    throw error;
  }
});








function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backo")
    : path.join(__dirname, "../backo");

  const nodePath = app.isPackaged
    ? path.join(process.resourcesPath, "node-runtime", "node.exe")
    : "C:\\Program Files\\nodejs\\node.exe";

  const serverPath = path.join(backendPath, "server.js");

  console.log("====================================");
  console.log("Electron Started");
  console.log("Packaged:", app.isPackaged);
  console.log("Backend:", serverPath);
  console.log("Node:", nodePath);
  console.log("====================================");

  backendProcess = spawn(nodePath, [serverPath], {
    cwd: backendPath,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout.on("data", (data) => {
    console.log("[Backend]", data.toString());
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("[Backend Error]", data.toString());
  });

  backendProcess.on("error", (error) => {
    console.error("[Electron] Could not start backend:", error);
  });

  backendProcess.on("close", (code) => {
    console.log("[Electron] Backend exited:", code);
  });
}


function waitForBackend(port = 5001, host = "127.0.0.1", timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        console.log(`[Electron] Backend is ready on ${host}:${port}`);
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startTime >= timeout) {
          reject(
            new Error(
              `Backend did not start on ${host}:${port} within ${timeout / 1000} seconds`
            )
          );
        } else {
          setTimeout(check, 300);
        }
      });

      socket.once("timeout", () => {
        socket.destroy();

        if (Date.now() - startTime >= timeout) {
          reject(
            new Error(
              `Backend did not start on ${host}:${port} within ${timeout / 1000} seconds`
            )
          );
        } else {
          setTimeout(check, 300);
        }
      });

      socket.connect(port, host);
    }

    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,

    icon: path.join(__dirname, "../build/icon.ico"),

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    const indexPath = app.isPackaged
      ? path.join(app.getAppPath(), "dist", "index.html")
      : path.join(__dirname, "../dist/index.html");

    console.log("Loading:", indexPath);

    mainWindow.loadFile(indexPath);
  } else {
    console.log("Loading: http://localhost:5173");

    mainWindow.loadURL("http://localhost:5173");

    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    }
  );


  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow.minimize();
  });


  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window Loaded Successfully");
  });

  mainWindow.webContents.on("console-message", (e, level, message) => {
    console.log("[Renderer]", message);
  });
}

app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForBackend(5001);

    createWindow();
  } catch (error) {
    console.error("[Electron] Backend startup failed:", error);

    createWindow();
  }
});


app.on("window-all-closed", () => {
  // Keep the billing application running.
});


app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});