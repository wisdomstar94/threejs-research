import { ForwardedRef, forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import useAddEventListener from "../../../hooks/use-add-event-listener/use-add-event-listener.hook";
import useAddResizeEventListener from "../../../hooks/use-add-resize-event-listener/use-add-resize-event-listener.hook";
import styles from "./threejs-canvas-box.component.module.scss";
import { IThreejsCanvasBox } from "./threejs-canvas-box.interface";

const ThreejsCanvasBox = forwardRef((props: IThreejsCanvasBox.Props, ref: ForwardedRef<IThreejsCanvasBox.RefObject>) => {
  const divElementRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    // 부모 컴포넌트에서 사용할 함수를 선언
    getCanvas,
  }));

  const getCanvas = useCallback(() => {
    return canvasRef.current;
  }, []);

  const sizeCheck = useCallback(() => {
    if (divElementRef.current === null) {
      return;
    }

    const canvasBoxWidth = divElementRef.current.clientWidth;
    const canvasBoxHeight = divElementRef.current.clientHeight;

    console.log({
      canvasBoxWidth,
      canvasBoxHeight,
    });

    props.__rendererRef?.current?.setSize(canvasBoxWidth, canvasBoxHeight);
    props.__camerasRef?.current?.forEach((camera) => {
      camera.aspect = canvasBoxWidth / canvasBoxHeight;
      camera.updateProjectionMatrix();
    });
  }, [props.__camerasRef, props.__rendererRef]);

  useAddResizeEventListener(divElementRef, (event) => {
    sizeCheck();
  });

  useAddEventListener(canvasRef, 'click', (event) => {
    if (typeof props.__onClick === 'function') {
      props.__onClick(event);
    }
  });

  useAddEventListener(canvasRef, 'mousemove', (event) => {
    if (typeof props.__onMousemove === 'function') {
      props.__onMousemove(event);
    }
  });

  return (
    <>
      <div 
        ref={divElementRef}
        style={props.__style}
        className={[
          styles['threejs-canvas-box'],
        ].join(' ')}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </>
  );
});
ThreejsCanvasBox.displayName = 'ThreejsCanvasBox';

export default ThreejsCanvasBox;