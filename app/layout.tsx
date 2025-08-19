import { createClient } from "contentful";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from 'react-toastify';

import GoogleAnalytics from "./components/GoogleAnalytics";
import { PreviewProvider } from "./contexts/PreviewContext";
import { NavbarProvider } from "./contexts/NavbarContext";
import { ErrorProvider } from "./contexts/ErrorContext";
import { MessageProvider } from "./contexts/MessageContext";
import composeProviders from "@/utils/provider/ComposeProviders";
import Message from "./components/Message";

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
      title:
        fields.title ||
        "Your FREE personalised dental website | Dentalbio - Your dental identity, simplified",
      description:
        fields.description ||
        "Build and personalise your Dentalbio website in minutes...",
    };
  } catch (error) {
    console.error("Error fetching landing page:", error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const landingPage = await fetchLandingPage();

  if (!landingPage) {
    return {
      title: "Default Title",
      description: "Default Description",
    };
  }

  return {
    title: landingPage.title,
    description: landingPage.description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BASE_URL || "https://dental.bio"
    ),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="Pw4B8ek0e6LOZZqGHufiTdEs-IXcGHD3hFS1U8q9478"
        />
      </head>
      <body className={`${inter.className} `}>
        {" "}
        <GoogleAnalytics ga_id={"G-987STTWJ02"} />
        <CombinedProviders>
          {children}
          <Message />
          <ToastContainer position="top-right" autoClose={2000} />
        </CombinedProviders>
      </body>
    </html>
  );
}
