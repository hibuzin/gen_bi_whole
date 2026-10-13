const { contextBridge, ipcRenderer } = require("electron");

console.log("========== PRELOAD ==========");
console.log("[PRELOAD] preload.cjs loaded");
console.log("=============================");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: () => {
    console.log("[PRELOAD] printReceipt called");
    return ipcRenderer.invoke("print-receipt");
  },
});
