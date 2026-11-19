import init, { version } from "./pkg/ttime_wasm.js?v=7787aafc88";

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
await init({ module_or_path: new URL("./pkg/ttime_wasm_bg.wasm?v=097e8b0fea", import.meta.url) });
$("build").textContent = version();
