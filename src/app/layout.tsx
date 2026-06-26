import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "opencommit",
  description: "make commits on mobile easier.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
