import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RSL-AI — الرافدين للحياة الذكية',
  description: 'نظام إدارة أعمال متكامل بمحرك مراقبة ذكي غير مرئي',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
