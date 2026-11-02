import type { Metadata, Viewport } from "next";
import "./splicer.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f9f5",
};

export const metadata: Metadata = {
  title: "Splicer · Optimum",
  description: "Calendario de nodos, producción y billing",
  applicationName: "Splicer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Splicer",
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
    <html lang="es" suppressHydrationWarning>
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
