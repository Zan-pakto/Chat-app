import "./globals.css";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Real-time Chat",
  description: "A production-ready real-time chat web app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
