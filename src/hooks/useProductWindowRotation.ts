import { useCallback, useEffect, useRef, useState } from "react";
import { shuffleOrder, windowProductIndices } from "../lib/rotationQueue.ts";

const DEFAULT_INTERVAL_MS = 30_000;
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

  const canRotate = items.length > windowSize;
  const itemsKey = items.map((item) => item.id).join("|");

  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [windowIndices, setWindowIndices] = useState<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initQueue = useCallback(
    (avoidFirst?: number) => {
      queueRef.current = shuffleOrder(items.length, avoidFirst);
      queuePosRef.current = 0;
    },
    [items.length]
  );

  const syncWindow = useCallback(() => {
    setWindowIndices(windowProductIndices(queueRef.current, queuePosRef.current, windowSize));
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
      if (items.length <= windowSize) return;

      const stepSize = Math.min(windowSize, queueRef.current.length);

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
    [items.length, initQueue, syncWindow, windowSize]
  );

  const startTimer = useCallback(() => {
    clearTimer();
    if (!canRotate || !autoRotate || paused || document.hidden) return;

    timerRef.current = setInterval(() => {
      if (document.hidden || paused) return;
      step(1);
    }, intervalMs);
  }, [autoRotate, canRotate, clearTimer, intervalMs, paused, step]);

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
  }, [startTimer, clearTimer, canRotate, itemsKey, paused, autoRotate]);

  const visibleItems = windowIndices.map((index) => items[index]).filter(Boolean) as T[];

  return {
    visibleItems,
    canRotate,
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
