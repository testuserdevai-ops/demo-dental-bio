import React from "react";

type SwitchProps = {
  id?: string;
  isChecked: boolean;
  onToggle: () => void;
  activeColor?: string;
  inactiveColor?: string;
  disabled?: boolean;
};

const Switch: React.FC<SwitchProps> = ({
  id = "switch-component-blue",
  isChecked,
  onToggle,
  activeColor = "var(--color-accent-purple, #7d71e5)",
  inactiveColor = "#fff",
  disabled = false,
}) => {
  return (
    <div className="relative inline-block w-8 h-5">
      <input
        checked={isChecked}
        onChange={onToggle}
        id={id}
        type="checkbox"
        className={`peer appearance-none w-8 h-5 border-grey-500 border-[1px] rounded-full ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} transition-colors duration-300`}
        style={{ backgroundColor: isChecked ? activeColor : inactiveColor }}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className="absolute top-0 left-[2px] w-[14px] h-[14px] mt-[3px] rounded-full shadow-sm transition-transform duration-300 cursor-pointer"
        style={{
          transform: isChecked ? "translateX(16px)" : "translateX(0)",
          backgroundColor: isChecked
            ? inactiveColor
            : "var(--color-accent-blue-light, #86B7FE)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      ></label>
    </div>
  );
};

export default Switch;
