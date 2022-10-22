import { useEffect, useRef } from "react";
import { fromEvent, Subscription } from "rxjs";

const useFromEvent = (element: Element | Document | Window | undefined | null, eventName: keyof HTMLElementEventMap | keyof WindowEventMap, callback: (event: any) => void) => {
  const subscriptionRef = useRef<Subscription | undefined>();

  useEffect(() => {
    subscriptionRef.current?.unsubscribe();

    if (element === undefined || element === null) {
      return;
    }

    subscriptionRef.current = fromEvent(element, eventName).subscribe((event) => {
      callback(event);
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [callback, element, eventName]);
};

export default useFromEvent;
