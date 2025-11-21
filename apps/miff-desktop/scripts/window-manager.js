const DEFAULT_BOUNDS = Object.freeze({ width: 520, height: 420 });

export class WindowManager {
  constructor({ desktopElement, taskbarElement }) {
    if (!desktopElement || !taskbarElement) {
      throw new Error("WindowManager requires desktop and taskbar elements");
    }

    this.desktop = desktopElement;
    this.taskbar = taskbarElement;
    this.taskbarApps = taskbarElement.querySelector(".taskbar-apps");
    this.windowTemplate = document.getElementById("desktop-window-template");

    this.apps = new Map();
    this.windows = new Map();
    this.zIndexCursor = 20;
    this.activeWindowId = null;
    this.nextOffset = 0;
  }

  registerApp(config) {
    if (!config?.id) {
      throw new Error("App must have a stable id");
    }

    const normalized = {
      ...config,
      width: config.width || DEFAULT_BOUNDS.width,
      height: config.height || DEFAULT_BOUNDS.height,
    };

    this.apps.set(normalized.id, normalized);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "taskbar-app-button";
    button.innerHTML = `<span class="icon">${normalized.icon ?? "⬛"}</span><span>${
      normalized.shortTitle || normalized.title
    }</span>`;
    button.addEventListener("click", () => this.toggleWindow(normalized.id));

    normalized.taskbarButton = button;
    this.taskbarApps?.appendChild(button);
  }

  toggleWindow(id) {
    const win = this.windows.get(id);
    if (!win) {
      this.openWindow(id);
      return;
    }

    if (win.state === "minimized") {
      this.restoreWindow(id);
      this.focusWindow(id);
    } else if (this.activeWindowId === id) {
      this.minimizeWindow(id);
    } else {
      this.focusWindow(id);
    }
  }

  openWindow(id) {
    const app = this.apps.get(id);
    if (!app) {
      console.warn("Unknown app", id);
      return;
    }

    const template = this.windowTemplate?.content?.firstElementChild;
    const element = template
      ? template.cloneNode(true)
      : this.#createWindowSkeleton();

    element.dataset.windowId = id;
    element.style.width = `${app.width}px`;
    element.style.height = `${app.height}px`;

    const offset = (this.nextOffset += 24) % 120;
    element.style.left = `${32 + offset}px`;
    element.style.top = `${32 + offset}px`;

    const titleEl = element.querySelector(".window-title");
    if (titleEl) {
      titleEl.innerHTML = `<span class="icon">${app.icon ?? "⬛"}</span><span>${
        app.title
      }</span>`;
    }

    const bodyEl = element.querySelector(".window-body");
    const headerEl = element.querySelector(".window-header");

    const windowState = {
      id,
      element,
      body: bodyEl,
      header: headerEl,
      state: "normal",
      cleanup: null,
    };

    this.desktop.appendChild(element);
    this.#wireWindowControls(windowState, app);
    this.#enableDragging(windowState);

    if (typeof app.mount === "function") {
      const cleanup = app.mount(bodyEl, { windowId: id, manager: this });
      if (typeof cleanup === "function") {
        windowState.cleanup = cleanup;
      }
    }

    this.windows.set(id, windowState);
    this.restoreWindow(id);
    this.focusWindow(id);
  }

  minimizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.state = "minimized";
    win.element.classList.add("is-minimized");
    win.element.style.display = "none";
    this.#setTaskbarActive(id, false);
    if (this.activeWindowId === id) {
      this.activeWindowId = null;
    }
  }

  restoreWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.state = "normal";
    win.element.classList.remove("is-minimized");
    win.element.style.display = "flex";
    this.#setTaskbarActive(id, true);
  }

  closeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    if (typeof win.cleanup === "function") {
      try {
        win.cleanup();
      } catch (error) {
        console.error("Failed to cleanup app", id, error);
      }
    }

    win.element.remove();
    this.windows.delete(id);
    this.#setTaskbarActive(id, false);
    if (this.activeWindowId === id) {
      this.activeWindowId = null;
    }
  }

  focusWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    this.activeWindowId = id;
    this.zIndexCursor += 1;
    win.element.style.zIndex = this.zIndexCursor;

    this.windows.forEach((entry, entryId) => {
      if (entryId === id) {
        entry.element.classList.add("is-active");
      } else {
        entry.element.classList.remove("is-active");
      }
    });

    this.#setTaskbarActive(id, true);
  }

  #setTaskbarActive(id, active) {
    const app = this.apps.get(id);
    if (!app?.taskbarButton) return;
    app.taskbarButton.classList.toggle("is-active", active);
  }

  #wireWindowControls(windowState, app) {
    const controls = windowState.element.querySelectorAll(".window-controls .window-btn");
    controls.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "minimize") {
          this.minimizeWindow(windowState.id);
        } else if (action === "close") {
          this.closeWindow(windowState.id);
        }
      });
    });

    windowState.element.addEventListener("mousedown", () => this.focusWindow(windowState.id));
  }

  #enableDragging(windowState) {
    const header = windowState.header;
    if (!header) return;

    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let dragging = false;

    const onMouseMove = (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const nextLeft = originLeft + deltaX;
      const nextTop = originTop + deltaY;
      this.#moveWindow(windowState, nextLeft, nextTop);
    };

    const onMouseUp = () => {
      dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    header.addEventListener("mousedown", (event) => {
      if (event.target.closest(".window-controls")) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      const rect = windowState.element.getBoundingClientRect();
      const desktopRect = this.desktop.getBoundingClientRect();
      originLeft = rect.left - desktopRect.left;
      originTop = rect.top - desktopRect.top;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  #moveWindow(windowState, left, top) {
    const desktopRect = this.desktop.getBoundingClientRect();
    const windowRect = windowState.element.getBoundingClientRect();
    const maxLeft = desktopRect.width - windowRect.width;
    const maxTop = desktopRect.height - windowRect.height;
    const clampedLeft = Math.max(0, Math.min(left, Math.max(0, maxLeft)));
    const clampedTop = Math.max(0, Math.min(top, Math.max(0, maxTop)));

    windowState.element.style.left = `${clampedLeft}px`;
    windowState.element.style.top = `${clampedTop}px`;
  }

  #createWindowSkeleton() {
    const section = document.createElement("section");
    section.className = "desktop-window";
    section.innerHTML = `
      <header class="window-header">
        <div class="window-title"></div>
        <div class="window-controls">
          <button class="window-btn" data-action="minimize" type="button">—</button>
          <button class="window-btn" data-action="close" type="button">×</button>
        </div>
      </header>
      <div class="window-body"></div>
    `;
    return section;
  }
}
