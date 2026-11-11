import type { Metadata } from "next";
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
  title: "MindMate AI | Trợ lý Lắng nghe & An toàn Tâm lý Học đường",
  description: "Không gian lắng nghe ẩn danh 100% và lưới chắn bảo vệ tâm lý dành cho học sinh THPT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Script tự động quét sạch thuộc tính của Extension trước khi Next.js Hydrate */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const clean = () => {
                  document.querySelectorAll('[bis_skin_checked], [bis_register]').forEach(el => {
                    el.removeAttribute('bis_skin_checked');
                    el.removeAttribute('bis_register');
                    for (const attr of Array.from(el.attributes)) {
                      if (attr.name.startsWith('__processed_') || attr.name.startsWith('bis_')) {
                        el.removeAttribute(attr.name);
                      }
                    }
                  });
                };
                clean();
                new MutationObserver(clean).observe(document.documentElement, {
                  attributes: true,
                  subtree: true,
                  childList: true
                });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}