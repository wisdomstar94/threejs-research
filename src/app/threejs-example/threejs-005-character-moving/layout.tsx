import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-005-character-moving`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}