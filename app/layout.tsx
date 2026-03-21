import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ToastContainer } from 'react-toastify';
import { headers } from "next/headers";

import GoogleAnalytics from "./components/GoogleAnalytics";
import { PreviewProvider } from "./contexts/PreviewContext";
import { NavbarProvider } from "./contexts/NavbarContext";
import { MessageProvider } from "./contexts/MessageContext";
import composeProviders from "@/utils/provider/ComposeProviders";
import Message from "./components/Message";
import { getDomainConfig } from "@/utils/domainConfig";
import { getLandingPageContent } from "@/lib/contentful";

import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import { replaceInString } from "@/utils/functions/functions";

const CombinedProviders = composeProviders(PreviewProvider, NavbarProvider, MessageProvider);

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  const content = await getLandingPageContent();

  const title = replaceInString(
    replaceInString(content.title, "{{vertical}}", domainConfig.vertical),
    "{{brand}}", domainConfig.brandName
  ) || `${domainConfig.brandName}`;

  const description = replaceInString(
    replaceInString(content.description, "{{vertical}}", domainConfig.vertical),
    "{{brand}}", domainConfig.brandName
  ) || "Build and personalise your website in minutes...";

  return {
    title,
    description,
    metadataBase: new URL(domainConfig.baseUrl),
    openGraph: {
      title,
      description,
      url: domainConfig.baseUrl,
      images: [{ url: domainConfig.heroImage }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [domainConfig.heroImage],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/favicon.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="Pw4B8ek0e6LOZZqGHufiTdEs-IXcGHD3hFS1U8q9478" />
        <meta httpEquiv="Content-Type" name="Acumbamail-domain-verification" content="7d4236e2-cdd5-11f0-8c76-005056bd5094" />
      </head>
      <body className={`${inter.className} ${manrope.variable}`}>
        {" "}
        {domainConfig.gaTrackingId && <GoogleAnalytics ga_id={domainConfig.gaTrackingId} />}
        <CombinedProviders>
          {children}
          <Message />
          <ToastContainer position="top-right" autoClose={2000} />
        </CombinedProviders>
      </body>
    </html>
  );
}
