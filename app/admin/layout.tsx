import "../globals.css";

export const metadata = {
  title: "Admin | Dentalbio",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://dental.bio"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="py-10 bg-gray-100">
      <div className="max-w-[1400px] mx-auto min-h-[100vh] bg-gray-100">
        {children}
      </div>
    </div>
  );
}
