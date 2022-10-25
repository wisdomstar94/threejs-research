import React from "react";

export declare namespace IJoystickBox {
  export type PressKey = 
    'ArrowUp' | 
    'ArrowRight' | 
    'ArrowDown' | 
    'ArrowLeft'
  ;  

  export interface Props {
    __onJumpTab: () => void;
    __onPressed: (pressKeys: PressKey[], isStrength: boolean) => void;
    __onPressOut: () => void;

    children?: React.ReactNode;
  }
}