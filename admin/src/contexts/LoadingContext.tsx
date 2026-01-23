import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

/**
 * Loading operation type
 */
export interface LoadingOperation {
  id: string;
  message: string;
  progress?: number; // 0-100, optional for determinate progress
}

/**
 * Sayfa yüklenme süresi bilgisi
 */
export interface PageLoadInfo {
  durationMs: number;
  operationId: string;
  timestamp: number;
}

/**
 * Loading context state
 */
interface LoadingContextState {
  operations: LoadingOperation[];
  isLoading: boolean;
  startLoading: (id: string, message: string) => void;
  updateProgress: (id: string, progress: number) => void;
  updateMessage: (id: string, message: string) => void;
  stopLoading: (id: string) => void;
  clearAll: () => void;
  // Sayfa yüklenme süresi
  lastPageLoadInfo: PageLoadInfo | null;
  clearPageLoadInfo: () => void;
}

const LoadingContext = createContext<LoadingContextState | undefined>(undefined);

/**
 * Loading Provider - Global loading state management
 */
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<LoadingOperation[]>([]);
  const [lastPageLoadInfo, setLastPageLoadInfo] = useState<PageLoadInfo | null>(null);

  // Her operasyon için başlangıç zamanını takip et
  const loadStartTimes = useRef<Map<string, number>>(new Map());

  const startLoading = useCallback((id: string, message: string) => {
    // Başlangıç zamanını kaydet
    if (!loadStartTimes.current.has(id)) {
      loadStartTimes.current.set(id, performance.now());
    }

    setOperations((prev) => {
      // Aynı ID varsa güncelle
      const existing = prev.find((op) => op.id === id);
      if (existing) {
        return prev.map((op) =>
          op.id === id ? { ...op, message, progress: undefined } : op
        );
      }
      // Yeni işlem ekle
      return [...prev, { id, message }];
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id ? { ...op, progress: Math.min(100, Math.max(0, progress)) } : op
      )
    );
  }, []);

  const updateMessage = useCallback((id: string, message: string) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, message } : op))
    );
  }, []);

  const stopLoading = useCallback((id: string) => {
    // Süreyi hesapla
    const startTime = loadStartTimes.current.get(id);
    if (startTime) {
      const durationMs = Math.round(performance.now() - startTime);
      loadStartTimes.current.delete(id);

      // Sayfa yüklenme bilgisini güncelle
      setLastPageLoadInfo({
        durationMs,
        operationId: id,
        timestamp: Date.now(),
      });
    }

    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    loadStartTimes.current.clear();
    setOperations([]);
  }, []);

  const clearPageLoadInfo = useCallback(() => {
    setLastPageLoadInfo(null);
  }, []);

  const value: LoadingContextState = {
    operations,
    isLoading: operations.length > 0,
    startLoading,
    updateProgress,
    updateMessage,
    stopLoading,
    clearAll,
    lastPageLoadInfo,
    clearPageLoadInfo,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

/**
 * Hook to use loading context
 */
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

/**
 * Helper hook for common loading patterns
 * Usage:
 *   const { execute } = useLoadingOperation("delete");
 *   await execute(async () => { ... }, "Siliniyor...");
 */
export function useLoadingOperation(operationId: string) {
  const { startLoading, stopLoading, updateProgress, updateMessage } = useLoading();

  const execute = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      message: string
    ): Promise<T> => {
      startLoading(operationId, message);
      try {
        const result = await operation();
        return result;
      } finally {
        stopLoading(operationId);
      }
    },
    [operationId, startLoading, stopLoading]
  );

  return {
    execute,
    updateProgress: (progress: number) => updateProgress(operationId, progress),
    updateMessage: (message: string) => updateMessage(operationId, message),
  };
}
