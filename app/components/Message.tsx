"use client";
import React from "react";
import { CheckCircle, XCircle, Info } from "@phosphor-icons/react"; // Import the required icons
import FullRoundedButton from "./Button/FullRoundedButton";
import { useMessage } from "../contexts/MessageContext";

const Message: React.FC = () => {
  const { messageStatus, closeMessage } = useMessage();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={32} className="text-primary-1" />;
      case "error":
        return <XCircle size={32} className="text-red-500" />;
      case "info":
        return <Info size={32} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-surface";
      case "error":
        return "bg-surface";
      case "info":
        return "bg-surface";
      default:
        return "bg-surface";
    }
  };

  return (
    <>
      {messageStatus.isOpen && (
        <div
          className={`modal-overlay overflow-auto fixed inset-0 bg-overlay cursor-pointer z-10 flex justify-center items-center 
            ${messageStatus.isOpen ? "animate-fade-in" : "animate-fade-out"}`}
          onMouseDown={closeMessage}
        >
          <div
            className={`max-w-[600px] w-full rounded-[26px] p-8 flex flex-col shadow-lg ${getMessageStyle(messageStatus.type)}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-4">
              {getIcon(messageStatus.type)} {/* Display the appropriate icon */}
              <div className="text-2xl font-semibold text-gray-800">
                {messageStatus.message}
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-4">
              {messageStatus.extraButtons}
              <FullRoundedButton onClick={closeMessage} buttonType="danger">
                Close
              </FullRoundedButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Message;
