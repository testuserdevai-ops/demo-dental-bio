import React from "react"

interface SwitchType {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Switch = ({ isChecked, onChange }: SwitchType) => {
  return (
    <div className="relative inline-block w-8 h-5">
      <input
        checked={isChecked}
        id="switch-component-blue"
        type="checkbox"
        className="peer appearance-none w-8 h-5 bg-white border-grey-500 border-[1px] rounded-full checked:bg-[#7d71e5] cursor-pointer transition-colors duration-300"
        onChange={onChange}
      />
      <label htmlFor="switch-component-blue" className="absolute top-0 left-[2px] w-[14px] h-[14px] mt-[3px] bg-[#86B7FE] rounded-full shadow-sm transition-transform duration-300 peer-checked:translate-x-4 peer-checked:border-grey-500 peer-checked:bg-white cursor-pointer">
      </label>
    </div>
  )
}