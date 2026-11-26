import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpleChat App",
  description: "Real-time room prototype built on Firebase Authentication, Firestore, and Express",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
