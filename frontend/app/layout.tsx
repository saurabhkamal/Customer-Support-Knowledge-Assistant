import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Customer Support Knowledge Assistant",
  description: "Graph RAG powered customer support assistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-gray-200 px-6 py-4 flex gap-6">
          <Link href="/" className="font-semibold">Home</Link>
          <Link href="/records">Records</Link>
          <Link href="/documents">Documents</Link>
          <Link href="/search">Search</Link>
          <Link href="/ask">Ask</Link>
          <Link href="/graph">Graph Explorer</Link>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}