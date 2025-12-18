import { createClient } from "contentful";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from 'react-toastify';
import { headers } from "next/headers";

import GoogleAnalytics from "./components/GoogleAnalytics";
import { PreviewProvider } from "./contexts/PreviewContext";
import { NavbarProvider } from "./contexts/NavbarContext";
import { ErrorProvider } from "./contexts/ErrorContext";
import { MessageProvider } from "./contexts/MessageContext";
import composeProviders from "@/utils/provider/ComposeProviders";
import Message from "./components/Message";
import { getDomainConfig } from "@/utils/domainConfig";

import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';

const CombinedProviders = composeProviders(PreviewProvider, NavbarProvider, ErrorProvider, MessageProvider);

// Define the type for your content type fields
interface LandingPageFields {
  title: string;
  description: string;
}

const inter = Inter({ subsets: ["latin"] });

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID || "",
  environment: process.env.CONTENTFUL_ENVIRONMENT || "master",
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || "",
});

async function fetchLandingPage(): Promise<LandingPageFields | null> {
  const entryId = process.env.CONTENTFUL_ENTRY_ID;

  if (!entryId) {
    console.error("Entry ID not provided");
    return null;
  }

  try {
    const entry = await client.getEntry(entryId);
    const fields = entry.fields as { title: string; description: string };

    return {
      title: fields.title || "Your FREE personalised website",
      description: fields.description || "Build and personalise your website in minutes...",
    };
  } catch (error) {
    console.error("Error fetching landing page:", error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const domainConfig = await getDomainConfig(headersList);
  const landingPage = await fetchLandingPage();

  if (!landingPage) {
    return {
      title: `Default Title - ${domainConfig.brandName}`,
      description: "Default Description",
      metadataBase: new URL(domainConfig.baseUrl),
    };
  }

  return {
    title: landingPage.title,
    description: landingPage.description,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const domainConfig = await getDomainConfig(headersList);

  console.log(domainConfig);

  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="Pw4B8ek0e6LOZZqGHufiTdEs-IXcGHD3hFS1U8q9478" />
        <meta httpEquiv="Content-Type" name="Acumbamail-domain-verification" content="7d4236e2-cdd5-11f0-8c76-005056bd5094" />
      </head>
      <body className={`${inter.className} `}>
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
