"use client";

import { ReactNode } from "react";

interface VerificationCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const VerificationCard: React.FC<VerificationCardProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <div
      className={`rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <h3 className="mb-3 text-lg font-semibold text-dark">{title}</h3>
      {children}
    </div>
  );
};

export default VerificationCard;
