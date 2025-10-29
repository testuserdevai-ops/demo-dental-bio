import React from "react";

interface IntroTextProps {
  className?: string;
  children: React.ReactNode;
}

const IntroText: React.FC<IntroTextProps> = ({ className = "", children }) => {
  return (
    <div className={`flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold ${className}`}>
      {children}
    </div>
  );
};

export default IntroText;
