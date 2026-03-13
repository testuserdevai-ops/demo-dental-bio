"use client";
import React from "react";

type CustomButtonProps = {
  text: string;
  onClick: any;
};

export default function CustomButton({ text, onClick }: CustomButtonProps) {
  return (
    <div className="relative z-50 left-1/2 top-10 transform -translate-x-1/2 max-w-xl w-full px-5">
      <button
        onClick={onClick}
        className="w-full text-xl md:text-2xl font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
      >
        {text}
      </button>
    </div>
  );
}
