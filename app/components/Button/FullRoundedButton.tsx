import { Spinner } from "@phosphor-icons/react/dist/ssr";
import React, { ButtonHTMLAttributes } from "react";

interface FullRoundedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  buttonType?: "primary" | "danger" | "ghost" | "warning";
}

const FullRoundedButton: React.FC<FullRoundedButtonProps> = ({
  children,
  className,
  isLoading,
  disabled = false,
  buttonType,
  ...props
}: FullRoundedButtonProps) => {
  return (
    <button
      className={`${className ? className : ""}
        ${disabled ? "opacity-50" : "opacity-100"}
        ${
          buttonType === "danger"
            ? " bg-red-500  enabled:hover:bg-red-800"
            : buttonType === "ghost"
              ? " bg-gray-500 enabled:hover:bg-gray-400"
              : buttonType === "warning"
                ? " bg-btn-gradient-terracotta enabled:hover:bg-btn-gradient-rust"
                : " bg-primary-1 enabled:hover:bg-deep-purple"
        } flex justify-center items-center px-[20px] py-[10px] font-bold text-white rounded-[26px] transition-all ease-in-out`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Spinner className="animate-spin mr-1" size={20} />}
      {children}
    </button>
  );
};

export default FullRoundedButton;
