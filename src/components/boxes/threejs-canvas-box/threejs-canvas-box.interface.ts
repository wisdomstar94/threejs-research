import React, { CSSProperties } from "react";

export declare namespace IThreejsCanvasBox {
  export interface RefObject {
    getCanvas: () => HTMLCanvasElement | null;
    // setRenderer: (renderer: THREE.WebGLRenderer) => void;
    // addCamera: (cameras: THREE.PerspectiveCamera) => void;
  }

  export interface Props {
    __style?: CSSProperties;
    __rendererRef?: { current: THREE.WebGLRenderer | undefined };
    __camerasRef?: { current: THREE.PerspectiveCamera[] | undefined };
    __scenesRef?: { current: THREE.Scene[] | undefined };
    __onClick?: (event: PointerEvent) => void;
    __onMousemove?: (event: MouseEvent) => void;

    children?: React.ReactNode;
  }
}