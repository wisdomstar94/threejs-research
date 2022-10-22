import { useEffect, useRef } from "react";

const useAddResizeEventListener = (__elementRef: { current: HTMLDivElement | null }, __callback: (event: ResizeObserverEntry[]) => void) => {
  const observerRef = useRef<ResizeObserver>();

  useEffect(() => {
    if (observerRef.current !== null && observerRef.current !== undefined) {
      observerRef.current.disconnect();
    }

    if (__elementRef.current === null) {
      return;
    }

    observerRef.current = new ResizeObserver((event) => __callback(event) );
    observerRef.current.observe(__elementRef.current);

    return () => {
      if (observerRef.current !== null && observerRef.current !== undefined) {
        observerRef.current.disconnect();
      }
    };
  }, [__callback, __elementRef]);
};

export default useAddResizeEventListener;