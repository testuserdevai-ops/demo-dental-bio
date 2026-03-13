// src/components/Modal.tsx
import { X } from "@phosphor-icons/react";
import React from "react";

export default function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-surface max-w-xl w-full p-6 rounded-[26px] shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute -top-14 right-0  bg-black bg-opacity-30 text-white p-2 rounded-full transition-all z-[3423746327432]"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
