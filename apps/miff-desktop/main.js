import { WindowManager } from "./scripts/window-manager.js";
import { ContentService } from "./scripts/services/content-service.js";
import { LLMService } from "./scripts/services/llm-service.js";
import { createNotesApp } from "./scripts/apps/notes-app.js";
import { createTerminalApp } from "./scripts/apps/terminal-app.js";
import { createLLMApp } from "./scripts/apps/llm-app.js";

const desktop = document.getElementById("desktop");
const taskbar = document.getElementById("taskbar");
const taskbarStatus = document.getElementById("taskbar-status");
const refreshButton = document.getElementById("refresh-content");
const clock = document.getElementById("desktop-clock");
const startButton = document.querySelector(".start-button");

const windowManager = new WindowManager({ desktopElement: desktop, taskbarElement: taskbar });
const contentService = new ContentService();
const llmService = new LLMService();

const apps = [
  createNotesApp({ contentService }),
  createTerminalApp({ contentService }),
  createLLMApp({ contentService, llmService }),
];

apps.forEach((app) => windowManager.registerApp(app));

["notes", "terminal", "llm"].forEach((id, index) => {
  setTimeout(() => windowManager.openWindow(id), index * 80);
});

startButton?.addEventListener("click", () => {
  windowManager.toggleWindow("notes");
});

refreshButton?.addEventListener("click", async () => {
  refreshButton.disabled = true;
  const original = refreshButton.textContent;
  refreshButton.textContent = "Syncing…";
  try {
    await contentService.getContent({ forceRefresh: true });
  } catch (error) {
    console.warn("Failed to refresh content", error);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = original;
  }
});

contentService.onStatusChange((status) => {
  if (!taskbarStatus) return;
  if (status.online) {
    const time = status.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now";
    taskbarStatus.textContent = `Content live • ${time}`;
    taskbarStatus.classList.remove("warn");
    taskbarStatus.classList.add("ok");
  } else {
    taskbarStatus.textContent = "Using local cache";
    taskbarStatus.classList.remove("ok");
    taskbarStatus.classList.add("warn");
  }
});

function updateClock() {
  if (!clock) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

updateClock();
setInterval(updateClock, 60_000);
