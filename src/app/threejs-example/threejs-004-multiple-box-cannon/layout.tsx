import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-004-multiple-box-cannon`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}