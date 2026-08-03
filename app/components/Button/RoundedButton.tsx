import { Spinner } from "@phosphor-icons/react/dist/ssr";
import React, { ButtonHTMLAttributes } from "react";

interface RoundedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  buttonType?: "primary" | "outlined";
}

const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  className,
  isLoading,
  disabled = false,
  buttonType = "primary",
  ...props
}: RoundedButtonProps) => {
  return (
    <button
      className={
        (className ? className : "") +
        (disabled
          ? " border-gray-300 text-gray-500"
          : buttonType === "outlined"
            ? " text-dark border-primary-1"
            : " text-white bg-primary-1 border-primary-1") +
        " flex items-center gap-2 py-2 md:py-3 z-[40] px-3 md:px-6 rounded-lg border"
      }
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Spinner className="animate-spin mr-1" size={20} />}
      {children}
    </button>
  );
};

export default RoundedButton;
