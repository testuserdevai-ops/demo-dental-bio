// app/forgot-password/layout.tsx
import { Suspense } from "react";

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div></div>}>
      <div className="min-h-screen">{children}</div>
    </Suspense>
  );
}
