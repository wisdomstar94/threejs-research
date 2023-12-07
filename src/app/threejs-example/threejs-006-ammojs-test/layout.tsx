import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-006-ammojs-test`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}