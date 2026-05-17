import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operation Empathy Dashboard",
  description: "Mock-data AI sales opportunity review prototype"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
