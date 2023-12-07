import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-008-character-moving-with-ammo`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}