import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-007-ammojs-custom-class-test`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}