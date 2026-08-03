"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface MessageStatus {
  message: string;
  extraButtons: ReactNode | null;
  isOpen: boolean;
  type: "success" | "error" | "info" | "default";
}

interface MessageContextProps {
  messageStatus: MessageStatus;
  setNotificationMessage: (status: {
    message: string;
    extraButtons?: ReactNode;
    type: "success" | "error" | "info" | "default";
  }) => void;
  closeMessage: () => void;
}

const MessageContext = createContext<MessageContextProps | undefined>(
  undefined,
);

export const MessageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [messageStatus, setMessageStatus] = useState<MessageStatus>({
    message: "",
    extraButtons: null,
    isOpen: false,
    type: "default",
  });

  const setNotificationMessage = ({
    message,
    extraButtons,
    type,
  }: {
    message: string;
    extraButtons?: ReactNode;
    type: "success" | "error" | "info" | "default";
  }) => {
    setMessageStatus({
      message,
      extraButtons,
      isOpen: true,
      type,
    });
  };

  const closeMessage = () => {
    setMessageStatus((prev) => ({
      ...prev,
      extraButtons: null,
      isOpen: false,
    }));
  };

  return (
    <MessageContext.Provider
      value={{ messageStatus, setNotificationMessage, closeMessage }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
};
