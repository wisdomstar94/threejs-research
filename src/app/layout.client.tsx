"use client"

import { ReactNode } from "react";
import { RecoilRoot } from "recoil";
import CommonLayout from "../components/layouts/common-layout/common-layout.component";

export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <>
      <RecoilRoot>
        <CommonLayout>
          { children }
        </CommonLayout>
      </RecoilRoot>
    </>
  );
}