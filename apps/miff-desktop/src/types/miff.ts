export interface MiffWallpaper {
  image?: string;
  blur?: boolean;
  tint?: string;
  credit?: string;
}

export interface MiffTheme {
  accent?: string;
  panel?: string;
  text?: string;
  mutedText?: string;
  taskbar?: string;
  wallpaperTint?: string;
  background?: string;
}

export interface MiffModuleWindowPreferences {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
}

export interface MiffModule {
  id: string;
  title: string;
  icon?: string;
  summary?: string;
  content?: string;
  description?: string;
  body?: string[];
  tags?: string[];
  window?: MiffModuleWindowPreferences;
}

export interface MiffContentPayload {
  intro?: {
    headline?: string;
    subline?: string;
  };
  wallpaper?: MiffWallpaper;
  theme?: MiffTheme;
  modules: MiffModule[];
}
