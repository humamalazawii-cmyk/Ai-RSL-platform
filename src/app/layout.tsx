import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI RSL Platform",
  description: "AI-Powered Universal ERP — Every sector, every scale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
