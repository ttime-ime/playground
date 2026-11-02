import init, { version } from "./pkg/ttime_wasm.js?v=e360af5557";

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
await init({ module_or_path: new URL("./pkg/ttime_wasm_bg.wasm?v=b9ce97e75e", import.meta.url) });
$("build").textContent = version();
