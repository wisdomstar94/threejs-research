import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-009-cannon-joystick-test`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}