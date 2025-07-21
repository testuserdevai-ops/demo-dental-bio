import React from "react";

interface IntroTextProps {
  text: string;
}

const IntroText: React.FC<IntroTextProps> = ({ text }) => {
  return (
    <div className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4">
      {text}
    </div>
  );
};

export default IntroText;
