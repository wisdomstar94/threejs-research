import { atom } from "recoil";
import { ICommonLayout } from "./common-layout.interface";

export const commonLayoutModeStateAtom = atom({
  key: 'commonLayoutModeState',
  default: 'pc-basic' as ICommonLayout.layoutMode,
});
