import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import Navbar from "@/components/Navbar";
import AuthContextProvider from "@/context/authContext";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// URL pública del sitio, para que la vista previa al compartir (WhatsApp, redes) use links absolutos.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://manu-frontendganaderia.gygo4l.easypanel.host";

const TITULO = "TerneData | Tu guachera ordenada por WhatsApp";
const DESCRIPCION =
  "Tu equipo manda un mensaje o un audio y TerneData anota cada ternero: nacimientos, pesadas, diarreas y tratamientos. Probalo gratis.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
    siteName: "TerneData",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='es' suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <Navbar />
          <AuthContextProvider>{children}</AuthContextProvider>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
