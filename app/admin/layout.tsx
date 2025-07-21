import "../globals.css";

export const metadata = {
  title: "Admin | Dentalbio",
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
