import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generative Video Studio — 4K Motion Backgrounds",
  description:
    "Procedurally generate, preview and render commercial-grade 4K seamless looping motion backgrounds for Adobe Stock contributors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
