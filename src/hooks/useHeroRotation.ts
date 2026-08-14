import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL_MS = 30_000;

function shuffleOrder(length: number, avoidFirst?: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];

  const indices = Array.from({ length }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1]) {
      const swapWith = indices.findIndex((v, j) => j !== i && v !== indices[i - 1]);
      if (swapWith >= 0) {
        [indices[i], indices[swapWith]] = [indices[swapWith], indices[i]];
      }
    }
  }

  if (avoidFirst !== undefined && indices[0] === avoidFirst) {
    const swapWith = indices.findIndex((v, j) => j > 0 && v !== avoidFirst);
    if (swapWith > 0) {
      [indices[0], indices[swapWith]] = [indices[swapWith], indices[0]];
    }
  }

  return indices;
}

export function useHeroRotation<T extends { id: string | number }>(
  items: T[],
  intervalMs = DEFAULT_INTERVAL_MS
) {
  const canRotate = items.length >= 2;
  const itemsKey = items.map((item) => item.id).join("|");

  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    if (items.length === 0) {
      queueRef.current = [];
      queuePosRef.current = 0;
      setActiveIndex(0);
      return;
    }

    initQueue();
    const first = queueRef.current[0] ?? 0;
    setActiveIndex(first);
  }, [itemsKey, items.length, initQueue]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (items.length <= 1) return;

      if (direction === 1) {
        let nextPos = queuePosRef.current + 1;
        if (nextPos >= queueRef.current.length) {
          const lastShown = queueRef.current[queuePosRef.current];
          initQueue(lastShown);
          nextPos = 0;
        }
        queuePosRef.current = nextPos;
        setActiveIndex(queueRef.current[nextPos] ?? 0);
        return;
      }

      if (queuePosRef.current === 0) {
        queuePosRef.current = queueRef.current.length - 1;
      } else {
        queuePosRef.current -= 1;
      }
      setActiveIndex(queueRef.current[queuePosRef.current] ?? 0);
    },
    [items.length, initQueue]
  );

  const goTo = useCallback(
    (productIndex: number) => {
      if (productIndex < 0 || productIndex >= items.length) return;
      if (productIndex === activeIndex) return;

      const posInQueue = queueRef.current.indexOf(productIndex);
      if (posInQueue >= 0) {
        queuePosRef.current = posInQueue;
      } else {
        initQueue(activeIndex);
        const pos = queueRef.current.indexOf(productIndex);
        queuePosRef.current = pos >= 0 ? pos : 0;
      }

      setActiveIndex(productIndex);
    },
    [activeIndex, items.length, initQueue]
  );

  const startTimer = useCallback(() => {
    clearTimer();
    if (!canRotate || document.hidden) return;

    timerRef.current = setInterval(() => {
      if (document.hidden) return;
      step(1);
    }, intervalMs);
  }, [canRotate, clearTimer, intervalMs, step]);

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
  }, [startTimer, clearTimer, canRotate, itemsKey]);

  const manualGoNext = useCallback(() => {
    if (!canRotate) return;
    step(1);
    resetTimer();
  }, [canRotate, step, resetTimer]);

  const manualGoPrev = useCallback(() => {
    if (!canRotate) return;
    step(-1);
    resetTimer();
  }, [canRotate, step, resetTimer]);

  const manualGoTo = useCallback(
    (productIndex: number) => {
      if (!canRotate) return;
      goTo(productIndex);
      resetTimer();
    },
    [canRotate, goTo, resetTimer]
  );

  const currentItem = items[activeIndex] ?? items[0] ?? null;

  return {
    currentItem,
    activeIndex,
    canRotate,
    goNext: manualGoNext,
    goPrev: manualGoPrev,
    goTo: manualGoTo,
  };
}
