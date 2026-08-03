"use client";
import React, { useState } from "react";
import classNames from "classnames";

type CustomButtonProps = {
  variant?: "default" | "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  actived?: boolean;
  name?: string;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  CustomButtonProps;

const IconButton: React.FC<ButtonProps> = ({
  variant = "default",
  size = "md",
  className,
  name,
  actived = false,
  disabled = false,
  children,
  ...rest
}) => {
  const [hovered, setHovered] = useState<boolean>(false);
  const baseStyles =
    "max-w-12 inline-flex items-center justify-center font-medium aspect-square rounded-full border-1";

  const variants = {
    default: "bg-transparent text-gray-light-border",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "p-1 text-sm",
    md: "p-2 text-base",
    lg: "p-3 text-lg",
  };

  const buttonStyles = classNames(
    baseStyles,
    variants[variant],
    sizes[size],
    { "opacity-50 cursor-not-allowed": disabled },
    hovered || actived ? "opacity-100" : "opacity-50",
    className,
  );

  return (
    <div
      className="flex flex-col items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`text-xs text-white font-light transition-opacity ${hovered || actived ? "opacity-100" : "opacity-0"}`}
      >
        {name}
      </div>
      <button
        className={buttonStyles}
        disabled={disabled}
        {...rest} // Spread the rest of the props to the button element
      >
        {children}
      </button>
    </div>
  );
};

export default IconButton;
