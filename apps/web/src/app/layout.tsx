import type { Metadata } from "next";
import { ClerkAuthProvider } from "@/components/clerk-provider";
import NavbarModern from "@/components/layout/NavbarModern";
import FooterModern from "@/components/layout/FooterModern";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIGIFIX Car Marketplace - Premium Auto Parts",
  description: "Find premium car parts for your vehicle. Search by number plate, browse categories, and get the best deals on auto parts.",
  keywords: "car parts, auto parts, car marketplace, vehicle parts, spare parts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-gray-50 text-gray-900">
        <ClerkAuthProvider>
          <div className="flex flex-col min-h-screen">
            <NavbarModern />
            <main className="flex-grow">
              {children}
            </main>
            <FooterModern />
          </div>
        </ClerkAuthProvider>
      </body>
    </html>
  );
}
