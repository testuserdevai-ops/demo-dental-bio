"use client";

import { useFormStatus } from "react-dom";

export const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <div className="relative z-50 left-1/2 top-5 transform -translate-x-1/2 max-w-lg w-full px-5 mt-5">
      <button
        type="submit"
        disabled={pending ? true : false}
        className="w-full text-lg font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[30px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-4 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
      >
        {pending ? "Logging in..." : "Log In"}
      </button>
    </div>
  );
};
