import init, { version } from "./pkg/ttime_wasm.js?v=39a9b0142b";

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
await init({ module_or_path: new URL("./pkg/ttime_wasm_bg.wasm?v=4836333691", import.meta.url) });
$("build").textContent = version();
