import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: `threejs-002-bloom-selective`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}