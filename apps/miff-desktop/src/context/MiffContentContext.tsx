import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import mockContent from '../mocks/mockContent';
import type { MiffContentPayload } from '../types/miff';

type MiffContentStatus = 'loading' | 'ready';

interface MiffContentContextValue {
  content: MiffContentPayload | null;
  status: MiffContentStatus;
  error: string | null;
  reload: () => Promise<void>;
  isMocked: boolean;
}

const MiffContentContext = createContext<MiffContentContextValue | undefined>(undefined);

function useShouldUseMocks() {
  return useMemo(() => {
    const envFlag = (import.meta.env.VITE_MIFF_DESKTOP_MOCKS ?? '').toString().toLowerCase();
    if (envFlag === '1' || envFlag === 'true') {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const flag = params.get('mocks');
    return flag === '1' || flag === 'true';
  }, []);
}

export function MiffContentProvider({ children }: { children: ReactNode }) {
  const shouldUseMocks = useShouldUseMocks();
  const [content, setContent] = useState<MiffContentPayload | null>(null);
  const [status, setStatus] = useState<MiffContentStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isMocked, setIsMocked] = useState(false);

  const hydrateFromMocks = useCallback(() => {
    setContent(mockContent);
    setStatus('ready');
    setIsMocked(true);
  }, []);

  const loadContent = useCallback(
    async (signal?: AbortSignal) => {
      if (shouldUseMocks) {
        hydrateFromMocks();
        setError(null);
        return;
      }

      setStatus('loading');
      setIsMocked(false);
      setError(null);

      const apiBase =
        import.meta.env.VITE_MIFF_API_ORIGIN ||
        (typeof window !== 'undefined' ? window.location.origin : '');

      try {
        const response = await fetch(`${apiBase}/api/miff/content`, {
          signal,
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Unable to load MIFF modules (${response.status})`);
        }

        const payload = (await response.json()) as MiffContentPayload;
        setContent({
          ...payload,
          modules: payload.modules ?? [],
        });
        setStatus('ready');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        hydrateFromMocks();
      }
    },
    [hydrateFromMocks, shouldUseMocks]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadContent(controller.signal);
    return () => controller.abort();
  }, [loadContent]);

  const reload = useCallback(async () => {
    await loadContent();
  }, [loadContent]);

  const value = useMemo(
    () => ({
      content,
      status,
      error,
      reload,
      isMocked,
    }),
    [content, status, error, reload, isMocked]
  );

  return <MiffContentContext.Provider value={value}>{children}</MiffContentContext.Provider>;
}

export function useMiffContent() {
  const context = useContext(MiffContentContext);
  if (!context) {
    throw new Error('useMiffContent must be used within a MiffContentProvider');
  }
  return context;
}
