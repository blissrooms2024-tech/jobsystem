import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bliss Rooms Job System",
  description: "Job assignment, check-in and payroll system for Bliss Rooms",
};

// Explicit, rather than relying on Next's default — on a phone this is
// what makes text render at its real size instead of a shrunk-down
// desktop-width page that needs pinch-zooming to read.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh"
      data-lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Applies the saved language choice before paint, so returning
            English-preference users don't see a flash of Chinese first. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )lang=([^;]+)/);if(m&&m[1]==='en')document.documentElement.setAttribute('data-lang','en');}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
