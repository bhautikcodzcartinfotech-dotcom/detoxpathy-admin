import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "./MainLayout";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DetoxPathy",
  description:
    "Body Detoxification Admin Panel - Manage your fitness and wellness platform",
  icons: {
    icon: [
      { url: "/image/detoxpathy-square.png", sizes: "any", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "16x16", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "32x32", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "48x48", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "64x64", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "96x96", type: "image/png" },
      { url: "/image/detoxpathy-square.png", sizes: "128x128", type: "image/png" },
    ],
    shortcut: "/image/detoxpathy-square.png",
    apple: [{ url: "/image/detoxpathy-square.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/image/detoxpathy-square.png" type="image/png" sizes="any" />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="32x32"
        />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="48x48"
        />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="64x64"
        />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="96x96"
        />
        <link
          rel="icon"
          href="/image/detoxpathy-square.png"
          type="image/png"
          sizes="128x128"
        />
        <link rel="shortcut icon" href="/image/detoxpathy-square.png" sizes="any" />
        <link rel="apple-touch-icon" href="/image/detoxpathy-square.png" sizes="180x180" />
        <meta name="theme-color" content="#fbbf24" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
          <Toaster position="top-right" reverseOrder={false} />
        </AuthProvider>
      </body>
    </html>
  );
}
