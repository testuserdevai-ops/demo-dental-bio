"use client";

import { useFormStatus } from "react-dom";

export const SubmitButton = ({ disabled }: { disabled?: boolean }) => {
  const { pending } = useFormStatus();
  return (
    <div className="relative z-50 left-1/2 top-10 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
      <button
        type="submit"
        disabled={pending || disabled ? true : false}
        className="w-full text-2xl font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
      >
        {pending ? "Logging in..." : "Log In"}
      </button>
    </div>
  );
};
