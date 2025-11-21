import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { useMiffContent } from '../context/MiffContentContext';
import { Taskbar } from './Taskbar';
import { WindowManager } from './WindowManager';
import { SplashScreen } from './SplashScreen';
import { MockBadge } from '../mocks/MockBadge';
function getWallpaperStyle(wallpaper, fallbackTint) {
    const image = wallpaper?.image;
    const backgroundImage = image
        ? image.startsWith('linear-gradient')
            ? image
            : `url(${image})`
        : 'radial-gradient(circle at 20% 20%, #312e81, #020617 60%)';
    return {
        backgroundImage,
        '--miff-wallpaper-tint': wallpaper?.tint || fallbackTint || 'rgba(2, 6, 23, 0.45)',
    };
}
function createWindowFromModule(module, offset, nextZ) {
    return {
        instanceId: nanoid(8),
        moduleId: module.id,
        title: module.title,
        icon: module.icon,
        content: module.content ?? module.description ?? module.summary,
        summary: module.summary,
        tags: module.tags,
        minimized: false,
        zIndex: nextZ,
        position: {
            x: 120 + offset,
            y: 100 + offset,
        },
        size: {
            width: module.window?.width ?? 480,
            height: module.window?.height ?? 360,
        },
        windowOptions: module.window,
    };
}
function getMaxZ(windows) {
    return windows.reduce((max, win) => Math.max(max, win.zIndex), 0);
}
export function DesktopShell() {
    const { content, status, error, reload, isMocked } = useMiffContent();
    const modules = content?.modules ?? [];
    const [windows, setWindows] = useState([]);
    const [activeWindowId, setActiveWindowId] = useState(null);
    const [showSplash, setShowSplash] = useState(true);
    useEffect(() => {
        if (status !== 'ready') {
            setShowSplash(true);
            return;
        }
        const timeout = setTimeout(() => setShowSplash(false), 1100);
        return () => clearTimeout(timeout);
    }, [status]);
    useEffect(() => {
        setWindows([]);
        setActiveWindowId(null);
    }, [content]);
    const wallpaperStyle = useMemo(() => getWallpaperStyle(content?.wallpaper, content?.theme?.wallpaperTint), [content]);
    useEffect(() => {
        if (!content?.theme) {
            return;
        }
        const { theme } = content;
        const root = document.documentElement;
        if (theme.accent)
            root.style.setProperty('--miff-accent', theme.accent);
        if (theme.panel)
            root.style.setProperty('--miff-panel', theme.panel);
        if (theme.text)
            root.style.setProperty('--miff-text-primary', theme.text);
        if (theme.mutedText)
            root.style.setProperty('--miff-text-muted', theme.mutedText);
        if (theme.taskbar)
            root.style.setProperty('--miff-taskbar', theme.taskbar);
        if (theme.wallpaperTint)
            root.style.setProperty('--miff-wallpaper-tint', theme.wallpaperTint);
        if (theme.background)
            root.style.setProperty('--miff-backdrop', theme.background);
    }, [content]);
    const focusWindow = useCallback((instanceId) => {
        setWindows((prev) => {
            const maxZ = getMaxZ(prev);
            return prev.map((win) => win.instanceId === instanceId ? { ...win, minimized: false, zIndex: maxZ + 1 } : win);
        });
        setActiveWindowId(instanceId);
    }, []);
    const closeWindow = useCallback((instanceId) => {
        setWindows((prev) => prev.filter((win) => win.instanceId !== instanceId));
        setActiveWindowId((current) => (current === instanceId ? null : current));
    }, []);
    const minimizeWindow = useCallback((instanceId) => {
        setWindows((prev) => prev.map((win) => (win.instanceId === instanceId ? { ...win, minimized: true } : win)));
        setActiveWindowId((current) => (current === instanceId ? null : current));
    }, []);
    const updatePosition = useCallback((instanceId, position) => {
        setWindows((prev) => prev.map((win) => (win.instanceId === instanceId ? { ...win, position } : win)));
    }, []);
    const updateSize = useCallback((instanceId, size) => {
        setWindows((prev) => prev.map((win) => (win.instanceId === instanceId ? { ...win, size } : win)));
    }, []);
    const launchModule = useCallback((moduleId) => {
        const module = modules.find((entry) => entry.id === moduleId);
        if (!module) {
            return;
        }
        let newActiveId = '';
        setWindows((prev) => {
            const maxZ = getMaxZ(prev);
            const existing = prev.find((win) => win.moduleId === module.id);
            if (existing) {
                newActiveId = existing.instanceId;
                return prev.map((win) => win.instanceId === existing.instanceId
                    ? { ...win, minimized: false, zIndex: maxZ + 1 }
                    : win);
            }
            const offset = Math.min(prev.length * 28, 140);
            const newWindow = createWindowFromModule(module, offset, maxZ + 1);
            newActiveId = newWindow.instanceId;
            return [...prev, newWindow];
        });
        if (newActiveId) {
            setActiveWindowId(newActiveId);
        }
    }, [modules]);
    const toggleModuleFromTaskbar = useCallback((moduleId) => {
        const windowForModule = windows.find((win) => win.moduleId === moduleId);
        if (!windowForModule) {
            launchModule(moduleId);
            return;
        }
        if (windowForModule.minimized) {
            focusWindow(windowForModule.instanceId);
            return;
        }
        if (activeWindowId === windowForModule.instanceId) {
            minimizeWindow(windowForModule.instanceId);
        }
        else {
            focusWindow(windowForModule.instanceId);
        }
    }, [activeWindowId, focusWindow, launchModule, minimizeWindow, windows]);
    const visibleWindows = windows.filter((win) => !win.minimized);
    const ready = status === 'ready' && modules.length > 0;
    return (<div className="desktop-shell">
      <div className="desktop-shell__wallpaper" style={wallpaperStyle}/>
      <div className="desktop-shell__workspace">
        {ready && (<WindowManager windows={visibleWindows} activeWindowId={activeWindowId} onFocus={focusWindow} onClose={closeWindow} onMinimize={minimizeWindow} onPositionChange={updatePosition} onSizeChange={updateSize}/>)}

        {!ready && status === 'loading' && (<div className="desktop-shell__status">
            <h2>Spinning up MIFF desktop</h2>
            <p>Preloading modules from /api/miff/content…</p>
          </div>)}

        {modules.length === 0 && status === 'ready' && (<div className="desktop-shell__status">
            <h2>No MIFF modules yet</h2>
            <p>There are no modules registered for this environment.</p>
            <button type="button" onClick={reload}>
              Retry fetch
            </button>
          </div>)}

        {error && (<div className="desktop-shell__status" style={{ marginTop: '2rem' }}>
            <h2>Using mock content</h2>
            <p>{error}</p>
            <button type="button" onClick={reload}>
              Try real API again
            </button>
          </div>)}
      </div>

      <Taskbar modules={modules} windows={windows} activeWindowId={activeWindowId} onModuleToggle={toggleModuleFromTaskbar}/>

      <SplashScreen visible={showSplash}/>
      {isMocked && <MockBadge />}
    </div>);
}
//# sourceMappingURL=DesktopShell.js.map