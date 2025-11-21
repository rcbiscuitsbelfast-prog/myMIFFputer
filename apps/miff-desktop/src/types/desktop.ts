import type { MiffModuleWindowPreferences } from './miff';

export interface DesktopWindowInstance {
  instanceId: string;
  moduleId: string;
  title: string;
  icon?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  zIndex: number;
  minimized: boolean;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  windowOptions?: MiffModuleWindowPreferences;
}
