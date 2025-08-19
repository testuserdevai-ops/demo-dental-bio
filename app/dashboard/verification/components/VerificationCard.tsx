'use client'

import { ReactNode } from "react";

interface VerificationCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const VerificationCard: React.FC<VerificationCardProps> = ({ 
  title, 
  children, 
  className = "" 
}) => {
  return (
    <div className={`p-6 bg-white rounded-[26px] ${className}`}>
      <h3 className="text-gray-500 mb-3">{title}</h3>
      {children}
    </div>
  );
};

export default VerificationCard; 