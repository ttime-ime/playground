import init, { version } from "./pkg/ttime_wasm.js";

const $ = (id) => document.getElementById(id);
$("copy-log").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("log-text").value);
    $("status").textContent = "Copied";
  } catch {
    $("log-text").select();
    $("status").textContent = "Press Ctrl/Cmd+C";
  }
  setTimeout(() => ($("status").textContent = ""), 2500);
});
await init();
$("build").textContent = version();
