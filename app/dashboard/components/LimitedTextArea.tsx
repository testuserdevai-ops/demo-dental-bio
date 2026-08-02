// components/AboutText.tsx
'use client'

import { Info } from '@phosphor-icons/react/dist/ssr';
import React, { InputHTMLAttributes, useState } from 'react';

interface LimitedTextAreaProp extends InputHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  required?: boolean;
  defaultText?: string;
  tooltip?: boolean;
  tooltipText?: string;
  limit?: number;
  className?: string;
  error?: string;
  allowOverLimit?: boolean;
}

const LimitedTextArea: React.FC<LimitedTextAreaProp> = ({
  name,
  placeholder,
  defaultText,
  tooltip,
  tooltipText,
  limit = 200,
  className,
  error,
  allowOverLimit = false,
  ...props
}) => {
  const isControlled = props.value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    props.defaultValue ? String(props.defaultValue) : defaultText || "",
  );
  const [isFocused, setIsFocused] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const maxLimit = limit;
  const currentValue = isControlled ? String(props.value ?? "") : uncontrolledValue;
  const isOverLimit = currentValue.length > maxLimit;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const data = allowOverLimit ? e.target.value : e.target.value.slice(0, maxLimit);

    if (data !== currentValue) {
      if (!isControlled) setUncontrolledValue(data);

      e.target.value = data;

      if (props.onChange)
        props.onChange(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (currentValue === '') {
      setIsFocused(false);
    }
  };

  const showTooltip = () => {
    setTooltipVisible(true);
  }

  const hideTooltip = () => {
    setTooltipVisible(false);
  }

  return (
    <div>
    <div className={`relative rounded-[26px] bg-white pt-[20px] pb-2 px-4 ${error ? 'ring-1 ring-red-500' : ''}`}>
      <label
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        htmlFor={name}
        className={`absolute flex items-center gap-1 top-[12px] text-gray-500 transition-all duration-100 ease-linear cursor-pointer transform ${isFocused || currentValue ? '-translate-y-[7px] text-xs' : 'scale-100'}`}
      >
        {placeholder}
        {tooltip &&
          <div
            className='flex-grow'>
            <Info
              size={20}
            />
            <div className={`absolute w-[300px] md:w-[400px] bottom-[30px] left-0 bg-dark-text-alpha text-white p-2 z-50 text-sm rounded-lg transition-opacity duration-300 break-words ${tooltipVisible ? "opacity-100 visible" : "opacity-0 invisible"}`}>{tooltipText}</div>
            {/* {tooltipVisible &&
                  <div className='absolute w-72 top-[-30px] left-6 bg-gray-900 text-white p-2 z-50 text-sm rounded-lg'>{tooltipText}</div>} */}
          </div>}
      </label>
      <textarea
        id={name}
        name={name}
        className={"w-full resize-none focus:outline-none text-base placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal min-h-40 " + className}
        // placeholder={placeholder}
        value={currentValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
        onChange={handleChange}
      />
      <div className={`text-right ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
        {currentValue.length}/{maxLimit}
      </div>
      {isOverLimit && (
        <p className="text-right text-red-500 text-sm" role="alert">
          Character limit exceeded by {currentValue.length - maxLimit}
        </p>
      )}
    </div>
    {error && <p className="text-red-500 text-sm mt-1 pl-4">{error}</p>}
    </div>
  );
}

export default LimitedTextArea;
