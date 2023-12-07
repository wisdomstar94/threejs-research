import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-003-glass-material`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}