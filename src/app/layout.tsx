import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AdminBackdrop } from "@/components/admin/AdminBackdrop";
import { Toaster } from "@/components/admin/Toaster";
import { TooltipProvider } from "@/components/admin/Tooltip";
import { getThemeCookie } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Career Reads Admin", template: "%s · Career Reads Admin" },
  description: "Manage Career Reads posts, jobs and settings.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

/** Resolves "system" before first paint so there is no light/dark flash. */
const themeScript = `(()=>{try{var r=document.documentElement;if(r.dataset.theme==="system"){r.classList.toggle("dark",matchMedia("(prefers-color-scheme: dark)").matches)}}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getThemeCookie();
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`admin-root ${theme === "dark" ? "dark" : ""} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <AdminBackdrop />
        <TooltipProvider>
          <div className="relative z-10">{children}</div>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
