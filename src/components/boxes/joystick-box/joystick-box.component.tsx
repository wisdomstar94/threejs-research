import { CSSProperties, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { fromEvent, Subscription } from "rxjs";
import { getTwoPointDistance } from "../../../librarys/math-util/math-util.library";
import styles from "./joystick-box.component.module.scss";
import { IJoystickBox } from "./joystick-box.interface";

interface Coordinate {
  x: number;
  y: number;
}

const JoystickBox = (props: IJoystickBox.Props) => {
  const handlerElementRef = useRef<HTMLDivElement>(null);
  // const handlerAllowAreaElementRef = useRef<HTMLDivElement>(null);
  const jumpTabButtonElementRef = useRef<HTMLDivElement>(null);
  const isJoystickPressed = useRef<boolean>(false);
  const pressedCoordinate = useRef<Coordinate>({ x: 0, y: 0 });
  const movedCoordinate = useRef<Coordinate>({ x: 0, y: 0 });
  const [handlerTransformState, setHandlerTransformState] = useState<string>();
  // const [isHandlerAllowAreaShow, setIsHandlerAllowAreaShow] = useState(false);
  const subscriptionsRef = useRef<Set<Subscription>>(new Set());

  useEffect(() => {
    if (handlerElementRef.current !== null) {
      subscriptionsRef.current.add(
        fromEvent<MouseEvent>(handlerElementRef.current, 'mousedown').subscribe((event) => {
          joystickPressed(event);
        })
      );

      subscriptionsRef.current.add(
        fromEvent<TouchEvent>(handlerElementRef.current, 'touchstart').subscribe((event) => {
          joystickPressed(event);
        })
      );
    }

    if (jumpTabButtonElementRef.current !== null) {
      subscriptionsRef.current.add(
        fromEvent<TouchEvent>(jumpTabButtonElementRef.current, 'touchstart').subscribe((event) => {
          if (typeof props.__onJumpTab === 'function') {
            props.__onJumpTab();
          }
        })
      );
    }

    if (typeof document !== 'undefined') {
      subscriptionsRef.current.add(
        fromEvent<MouseEvent>(document, 'mousemove').subscribe((event) => {
          joystickMoved(event);
        })
      );

      subscriptionsRef.current.add(
        fromEvent<TouchEvent>(document, 'touchmove').subscribe((event) => {
          joystickMoved(event);
        })
      );

      subscriptionsRef.current.add(
        fromEvent<MouseEvent>(document, 'mouseup').subscribe((event) => {
          joystickHandOuted(event);
        })
      );

      subscriptionsRef.current.add(
        fromEvent<TouchEvent>(document, 'touchend').subscribe((event) => {
          // alert('event.touches.length' + event.touches.length);
          if (event.touches.length >= 1) {
            return;
          }
          joystickHandOuted(event);
        })
      );
    }

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      subscriptionsRef.current.forEach(x => x.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateDistance = useCallback((event: MouseEvent | TouchEvent): Coordinate => {
    let x = 0;
    let y = 0;

    if (event instanceof MouseEvent) {
      x = event.pageX - pressedCoordinate.current.x;
      y = event.pageY - pressedCoordinate.current.y;
    } else {
      x = event.touches[0].pageX - pressedCoordinate.current.x;
      y = event.touches[0].pageY - pressedCoordinate.current.y;
    }

    return {
      x, 
      y,
    };
  }, []);

  const joystickPressed = useCallback((event: MouseEvent | TouchEvent) => {
    console.log('joystickPressed.event', event);
    
    isJoystickPressed.current = true;
    // setIsHandlerAllowAreaShow(true);

    if (event instanceof MouseEvent) {
      pressedCoordinate.current.x = event.pageX;
      pressedCoordinate.current.y = event.pageY;
    } else {
      pressedCoordinate.current.x = event.touches[0].pageX;
      pressedCoordinate.current.y = event.touches[0].pageY;
    }
  }, []);

  const joystickMoved = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isJoystickPressed.current) {
      return;
    }

    if (event instanceof MouseEvent) {
      movedCoordinate.current.x = event.pageX;
      movedCoordinate.current.y = event.pageY;
    } else {
      movedCoordinate.current.x = event.touches[0].pageX;
      movedCoordinate.current.y = event.touches[0].pageY;
    }

    const distanceCoordinate = calculateDistance(event);
    const maxValue = 40;
    let x = distanceCoordinate.x;
    let y = distanceCoordinate.y;
    if (x < -maxValue) {
      x = -maxValue;
    } else if (x > maxValue) {
      x = maxValue;
    }
    if (y < -maxValue) {
      y = -maxValue;
    } else if (y > maxValue) {
      y = maxValue;
    }
    setHandlerTransformState(`translateX(${x}px) translateY(${y}px)`);

    const radian = Math.atan2(pressedCoordinate.current.y - movedCoordinate.current.y, pressedCoordinate.current.x - movedCoordinate.current.x);
    const angle = radian * (180 / Math.PI);
    const distance = getTwoPointDistance(pressedCoordinate.current, movedCoordinate.current);

    // const angle = getAngle()
    console.log('angle', angle);
    console.log('distance', distance);

    let pressKeys: IJoystickBox.PressKey[] = [];
    // calculate direction
    if (65 <= angle && angle < 115) {
      // ArrowUp
      pressKeys = ['ArrowUp'];
    } else if (115 <= angle && angle < 155) {
      // ArrowUp + ArrowRight
      pressKeys = ['ArrowUp', 'ArrowRight'];
    } else if (155 <= angle && angle <= 180) {
      // ArrowRight
      pressKeys = ['ArrowRight'];
    } else if (-180 <= angle && angle < -155) {
      // ArrowRight
      pressKeys = ['ArrowRight'];
    } else if (-155 <= angle && angle < -115) {
      // ArrowDown + ArrowRight
      pressKeys = ['ArrowDown', 'ArrowRight'];
    } else if (-115 <= angle && angle < -65) {
      // ArrowDown
      pressKeys = ['ArrowDown'];
    } else if (-65 <= angle && angle < -25) {
      // ArrowDown + ArrowLeft
      pressKeys = ['ArrowDown', 'ArrowLeft'];
    } else if (-25 <= angle && angle < 25) {
      // ArrowLeft
      pressKeys = ['ArrowLeft'];
    } else if (25 <= angle && angle < 65) {
      // ArrowUp + ArrowLeft
      pressKeys = ['ArrowUp', 'ArrowLeft'];
    }

    let isStrength = false;
    if (distance > 30) {
      isStrength = true;
    }

    if (typeof props.__onPressed === 'function') {
      props.__onPressed(pressKeys, isStrength);
    }
  }, [calculateDistance, props]);

  const joystickHandOuted = useCallback((event: MouseEvent | TouchEvent) => {
    isJoystickPressed.current = false;
    // setIsHandlerAllowAreaShow(false);
    console.log('joystickHandOuted.event', event);

    setHandlerTransformState('translateX(0) translateY(0)');
    if (typeof props.__onPressOut === 'function') {
      props.__onPressOut();
    }
  }, [props]);

  const jumpTabButtonClick = useCallback(() => {
    if (typeof props.__onJumpTab === 'function') {
      props.__onJumpTab();
    }
  }, [props]);

  const handlerStyles = useCallback(() => {
    let obj: CSSProperties = {};
    
    if (typeof handlerTransformState === 'string') {
      obj.transform = handlerTransformState;
    }

    return obj;
  }, [handlerTransformState]);

  return (
    <>
      <div className={[
          styles['joystick-box']
        ].join(' ')}>
        <div className={[
            styles['background']
          ].join(' ')}>

        </div>
        <div className={[
            styles['handler']
          ].join(' ')}
          ref={handlerElementRef}
          style={handlerStyles()}>

        </div>
      </div>

      {/* <div 
        className={[
          styles['handler-allow-area'],
          // isHandlerAllowAreaShow ? styles['show'] : styles['hide']
        ].join(' ')}
        ref={handlerAllowAreaElementRef}>

      </div> */}

      <div className={[
          styles['jump-tab-box']
        ].join(' ')}
        onClick={jumpTabButtonClick}>
        <div className={[
            styles['jump-tab-button']
          ].join(' ')}
          ref={jumpTabButtonElementRef}>
          jump!
        </div>
      </div>
    </>
  );
};

export default JoystickBox;