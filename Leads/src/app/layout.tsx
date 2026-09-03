import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sangita Leads",
  description: "Lead finder dashboard for YouTube channel discovery and Google Sheets sync.",
  favicon: "/Sanglogo.png",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
