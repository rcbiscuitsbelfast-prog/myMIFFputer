import clsx from 'clsx';
import type { DesktopWindowInstance } from '../types/desktop';
import type { MiffModule } from '../types/miff';
import { useClock } from '../hooks/useClock';

interface TaskbarProps {
  modules: MiffModule[];
  windows: DesktopWindowInstance[];
  activeWindowId: string | null;
  onModuleToggle: (moduleId: string) => void;
}

export function Taskbar({ modules, windows, activeWindowId, onModuleToggle }: TaskbarProps) {
  const now = useClock();
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateLabel = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <footer className="taskbar">
      <div className="taskbar__brand">
        <span aria-hidden="true">⟁</span>
        <div className="taskbar__brand-text">
          <strong>myMIFFputer</strong>
          <small>desktop</small>
        </div>
      </div>
      <div className="taskbar__items">
        {modules.map((module) => {
          const openWindow = windows.find((w) => w.moduleId === module.id);
          const isActive = Boolean(openWindow && openWindow.instanceId === activeWindowId && !openWindow.minimized);
          const isImageIcon = Boolean(module.icon && module.icon.includes('/'));

          return (
            <button
              key={module.id}
              type="button"
              className={clsx('taskbar__item', {
                'taskbar__item--open': Boolean(openWindow),
                'taskbar__item--active': isActive,
              })}
              onClick={() => onModuleToggle(module.id)}
              title={module.title}
              aria-label={module.title}
            >
              {isImageIcon ? (
                <img src={module.icon} alt={module.title} />
              ) : (
                <span>{module.icon ?? module.title.slice(0, 2)}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="taskbar__clock">
        <strong>{timeLabel}</strong>
        <small>{dateLabel}</small>
      </div>
    </footer>
  );
}
