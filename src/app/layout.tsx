import { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import SideBar from "../components/layouts/side-bar/side-bar.component";
import TopBar from "../components/layouts/top-bar/top-bar.component";
import ContentArea from "../components/layouts/content-area/content-area.component";
import { RootLayoutClient } from "./layout.client";

export const metadata: Metadata = {
  title: `three.js research`,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <RootLayoutClient>
          { children }
        </RootLayoutClient>
      </body>
    </html>
  );
}