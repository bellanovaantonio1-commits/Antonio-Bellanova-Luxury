import { useCallback, useEffect, useRef, useState } from "react";
import { shuffleOrder, windowProductIndices } from "../lib/rotationQueue.ts";

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_WINDOW_SIZE = 3;

interface ProductWindowRotationOptions {
  intervalMs?: number;
  windowSize?: number;
  paused?: boolean;
  autoRotate?: boolean;
}

export function useProductWindowRotation<T extends { id: string | number }>(
  items: T[],
  options: ProductWindowRotationOptions = {}
) {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    windowSize = DEFAULT_WINDOW_SIZE,
    paused = false,
    autoRotate = true,
  } = options;

  const canRotate = items.length >= windowSize;
  const itemsKey = items.map((item) => item.id).join("|");

  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(paused);
  const stepRef = useRef<(direction: 1 | -1) => void>(() => {});

  const [windowIndices, setWindowIndices] = useState<number[]>([]);
  const [cycle, setCycle] = useState(0);

  pausedRef.current = paused;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const getStepSize = useCallback(
    (length: number) => {
      if (length <= windowSize) return 1;
      if (length <= windowSize * 2) return Math.max(1, windowSize - 1);
      return windowSize;
    },
    [windowSize]
  );

  const initQueue = useCallback(
    (avoidFirst?: number) => {
      queueRef.current = shuffleOrder(items.length, avoidFirst);
      queuePosRef.current = 0;
    },
    [items.length]
  );

  const syncWindow = useCallback(() => {
    setWindowIndices(windowProductIndices(queueRef.current, queuePosRef.current, windowSize));
    setCycle((value) => value + 1);
  }, [windowSize]);

  useEffect(() => {
    if (items.length === 0) {
      queueRef.current = [];
      queuePosRef.current = 0;
      setWindowIndices([]);
      return;
    }

    initQueue();
    syncWindow();
  }, [itemsKey, items.length, initQueue, syncWindow]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (items.length < windowSize) return;

      const stepSize = getStepSize(items.length);

      if (direction === 1) {
        let nextPos = queuePosRef.current + stepSize;
        if (nextPos >= queueRef.current.length) {
          const lastShown = queueRef.current[queuePosRef.current];
          initQueue(lastShown);
          nextPos = 0;
        }
        queuePosRef.current = nextPos;
      } else {
        queuePosRef.current -= stepSize;
        if (queuePosRef.current < 0) {
          queuePosRef.current = Math.max(0, queueRef.current.length - stepSize);
        }
      }

      syncWindow();
    },
    [getStepSize, initQueue, items.length, syncWindow, windowSize]
  );

  stepRef.current = step;

  const startTimer = useCallback(() => {
    clearTimer();
    if (!canRotate || !autoRotate || pausedRef.current || document.hidden) return;

    timerRef.current = setInterval(() => {
      if (document.hidden || pausedRef.current) return;
      stepRef.current(1);
    }, intervalMs);
  }, [autoRotate, canRotate, clearTimer, intervalMs]);

  const resetTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else {
        startTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimer();
    };
  }, [startTimer, clearTimer, canRotate, itemsKey, autoRotate]);

  useEffect(() => {
    if (paused) {
      clearTimer();
    } else {
      startTimer();
    }
  }, [paused, clearTimer, startTimer]);

  const visibleItems = windowIndices.map((index) => items[index]).filter(Boolean) as T[];

  return {
    visibleItems,
    canRotate,
    cycle,
    goNext: () => {
      if (!canRotate) return;
      step(1);
      resetTimer();
    },
    goPrev: () => {
      if (!canRotate) return;
      step(-1);
      resetTimer();
    },
  };
}
