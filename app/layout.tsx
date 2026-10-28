import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./fonts.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { HideDevBadge } from "@/components/shell/hide-dev-badge";

export const metadata: Metadata = {
  title: "HINTON studio — Studio video & hình ảnh AI",
  description: "HINTON studio: nền tảng sáng tạo video và hình ảnh AI chuyên nghiệp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className="hs-fonts">
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <HideDevBadge />
      </body>
    </html>
  );
}
