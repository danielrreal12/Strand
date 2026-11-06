import type { Metadata, Viewport } from "next";
import "./splicer.css";
import "./theme.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f5f8",
};

export const metadata: Metadata = {
  title: "Strand",
  description: "Node calendar, production, and billing",
  applicationName: "Strand",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Strand",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("splicer-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
