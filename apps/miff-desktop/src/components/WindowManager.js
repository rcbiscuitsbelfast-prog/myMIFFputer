import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { Rnd } from 'react-rnd';
export function WindowManager({ windows, activeWindowId, onFocus, onClose, onMinimize, onPositionChange, onSizeChange, }) {
    return (_jsx("div", { className: "window-manager", children: windows.map((win) => (_jsx(Rnd, { size: win.size, position: win.position, minWidth: win.windowOptions?.minWidth ?? 320, minHeight: win.windowOptions?.minHeight ?? 220, bounds: "parent", dragHandleClassName: "desktop-window__chrome", onDragStart: () => onFocus(win.instanceId), onDragStop: (_, data) => onPositionChange(win.instanceId, { x: data.x, y: data.y }), onResizeStart: () => onFocus(win.instanceId), onResizeStop: (_event, _dir, ref, _delta, position) => {
                onSizeChange(win.instanceId, {
                    width: parseFloat(ref.style.width),
                    height: parseFloat(ref.style.height),
                });
                onPositionChange(win.instanceId, position);
            }, enableResizing: win.windowOptions?.resizable ?? true, className: clsx('desktop-window', {
                'desktop-window--active': activeWindowId === win.instanceId,
            }), style: { zIndex: win.zIndex }, children: _jsxs("article", { className: "desktop-window__inner", onMouseDownCapture: () => onFocus(win.instanceId), children: [_jsxs("header", { className: "desktop-window__chrome", onMouseDown: () => onFocus(win.instanceId), children: [_jsxs("div", { className: "desktop-window__title", children: [win.icon ? (win.icon.includes('/') ? (_jsx("img", { src: win.icon, alt: `${win.title} icon` })) : (_jsx("span", { className: "icon", "aria-hidden": "true", children: win.icon }))) : (_jsx("span", { className: "icon", "aria-hidden": "true", children: win.title.slice(0, 2) })), win.title] }), _jsxs("div", { className: "desktop-window__actions", children: [_jsx("button", { type: "button", "aria-label": "Minimize", onClick: () => onMinimize(win.instanceId), children: "\u2013" }), _jsx("button", { type: "button", "aria-label": "Close", onClick: () => onClose(win.instanceId), children: "\u00D7" })] })] }), _jsxs("div", { className: "desktop-window__content", children: [win.summary && _jsx("p", { style: { fontWeight: 600, color: 'var(--miff-text-primary)' }, children: win.summary }), win.content && _jsx("p", { children: win.content }), win.tags && win.tags.length > 0 && (_jsx("div", { style: { marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }, children: win.tags.map((tag) => (_jsx("span", { style: {
                                        padding: '0.15rem 0.65rem',
                                        borderRadius: '999px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.04em',
                                    }, children: tag }, tag))) }))] })] }) }, win.instanceId))) }));
}
