import { Libre_Franklin } from "next/font/google";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "BJJ Grading Report",
  description: "Visual grading report for coaches — Adults and Kids by belt",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/pja-logo.png",
    apple: "/pja-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${libreFranklin.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-0 flex-col overflow-x-clip font-sans">
        {children}
      </body>
    </html>
  );
}
