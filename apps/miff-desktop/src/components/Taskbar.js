import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useClock } from '../hooks/useClock';
export function Taskbar({ modules, windows, activeWindowId, onModuleToggle }) {
    const now = useClock();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
    const dateLabel = now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
    return (_jsxs("footer", { className: "taskbar", children: [_jsxs("div", { className: "taskbar__brand", children: [_jsx("span", { "aria-hidden": "true", children: "\u27C1" }), _jsxs("div", { className: "taskbar__brand-text", children: [_jsx("strong", { children: "myMIFFputer" }), _jsx("small", { children: "desktop" })] })] }), _jsx("div", { className: "taskbar__items", children: modules.map((module) => {
                    const openWindow = windows.find((w) => w.moduleId === module.id);
                    const isActive = Boolean(openWindow && openWindow.instanceId === activeWindowId && !openWindow.minimized);
                    const isImageIcon = Boolean(module.icon && module.icon.includes('/'));
                    return (_jsx("button", { type: "button", className: clsx('taskbar__item', {
                            'taskbar__item--open': Boolean(openWindow),
                            'taskbar__item--active': isActive,
                        }), onClick: () => onModuleToggle(module.id), title: module.title, "aria-label": module.title, children: isImageIcon ? (_jsx("img", { src: module.icon, alt: module.title })) : (_jsx("span", { children: module.icon ?? module.title.slice(0, 2) })) }, module.id));
                }) }), _jsxs("div", { className: "taskbar__clock", children: [_jsx("strong", { children: timeLabel }), _jsx("small", { children: dateLabel })] })] }));
}
