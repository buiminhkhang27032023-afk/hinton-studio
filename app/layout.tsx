import type { Metadata } from "next";
import { Be_Vietnam_Pro, Instrument_Serif } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { HideDevBadge } from "@/components/shell/hide-dev-badge";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hinton — Studio video & hình ảnh AI",
  description: "Studio sáng tạo AI: tạo video thời trang từ ảnh và kịch bản.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <HideDevBadge />
      </body>
    </html>
  );
}
