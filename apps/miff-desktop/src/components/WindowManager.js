import clsx from 'clsx';
import { Rnd } from 'react-rnd';
export function WindowManager({ windows, activeWindowId, onFocus, onClose, onMinimize, onPositionChange, onSizeChange, }) {
    return (<div className="window-manager">
      {windows.map((win) => (<Rnd key={win.instanceId} size={win.size} position={win.position} minWidth={win.windowOptions?.minWidth ?? 320} minHeight={win.windowOptions?.minHeight ?? 220} bounds="parent" dragHandleClassName="desktop-window__chrome" onDragStart={() => onFocus(win.instanceId)} onDragStop={(_, data) => onPositionChange(win.instanceId, { x: data.x, y: data.y })} onResizeStart={() => onFocus(win.instanceId)} onResizeStop={(_event, _dir, ref, _delta, position) => {
                onSizeChange(win.instanceId, {
                    width: parseFloat(ref.style.width),
                    height: parseFloat(ref.style.height),
                });
                onPositionChange(win.instanceId, position);
            }} enableResizing={win.windowOptions?.resizable ?? true} className={clsx('desktop-window', {
                'desktop-window--active': activeWindowId === win.instanceId,
            })} style={{ zIndex: win.zIndex }}>
          <article className="desktop-window__inner" onMouseDownCapture={() => onFocus(win.instanceId)}>
            <header className="desktop-window__chrome" onMouseDown={() => onFocus(win.instanceId)}>
              <div className="desktop-window__title">
                {win.icon ? (win.icon.includes('/') ? (<img src={win.icon} alt={`${win.title} icon`}/>) : (<span className="icon" aria-hidden="true">
                      {win.icon}
                    </span>)) : (<span className="icon" aria-hidden="true">
                    {win.title.slice(0, 2)}
                  </span>)}
                {win.title}
              </div>
              <div className="desktop-window__actions">
                <button type="button" aria-label="Minimize" onClick={() => onMinimize(win.instanceId)}>
                  –
                </button>
                <button type="button" aria-label="Close" onClick={() => onClose(win.instanceId)}>
                  ×
                </button>
              </div>
            </header>
            <div className="desktop-window__content">
              {win.summary && <p style={{ fontWeight: 600, color: 'var(--miff-text-primary)' }}>{win.summary}</p>}
              {win.content && <p>{win.content}</p>}
              {win.tags && win.tags.length > 0 && (<div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {win.tags.map((tag) => (<span key={tag} style={{
                        padding: '0.15rem 0.65rem',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.75rem',
                        letterSpacing: '0.04em',
                    }}>
                      {tag}
                    </span>))}
                </div>)}
            </div>
          </article>
        </Rnd>))}
    </div>);
}
//# sourceMappingURL=WindowManager.js.map