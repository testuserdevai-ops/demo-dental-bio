// components/AboutText.tsx
'use client'

import { Info } from '@phosphor-icons/react/dist/ssr';
import React, { InputHTMLAttributes, useEffect, useState } from 'react';

interface LimitedTextAreaProp extends InputHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  required?: boolean;
  defaultText?: string;
  tooltip?: boolean;
  tooltipText?: string;
  limit?: number;
  className?: string;
}

const LimitedTextArea: React.FC<LimitedTextAreaProp> = ({
  name,
  placeholder,
  defaultText,
  tooltip,
  tooltipText,
  limit = 200,
  className,
  ...props
}) => {
  const [aboutTextContent, setAboutTextContent] = useState(props.value ? props.value as string : props.defaultValue ? props.defaultValue as string : defaultText || ""); // Track the textarea content
  const [isFocused, setIsFocused] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const maxLimit = limit;

  useEffect(() => {
    if (props.value) {
      const data = (props.value as string).slice(0, maxLimit);
      if (data !== aboutTextContent) {
        setAboutTextContent(data);
      }
    }
  }, [props])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const data = e.target.value.slice(0, maxLimit);

    if (data !== aboutTextContent) {
      setAboutTextContent(data);

      e.target.value = data;

      if (props.onChange)
        props.onChange(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (aboutTextContent === '') {
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
    <>
      <div className="mb-3">
        <div className='relative rounded-[26px] bg-white pt-[20px] pb-2 px-4'>
          <label
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            htmlFor={name}
            className={`absolute flex items-center gap-1 top-[12px] text-gray-500 transition-all duration-100 ease-linear cursor-pointer transform ${isFocused || aboutTextContent ? '-translate-y-[7px] text-xs' : 'scale-100'}`}
          >
            {placeholder}
            {tooltip &&
              <div
                className='flex-grow'>
                <Info
                  size={20}
                />
                <div className={`absolute w-[300px] md:w-[400px] bottom-[30px] left-0 bg-[#121822e8] text-white p-2 z-50 text-sm rounded-lg transition-opacity duration-300 break-words ${tooltipVisible ? "opacity-100 visible" : "opacity-0 invisible"}`}>{tooltipText}</div>
                {/* {tooltipVisible &&
                  <div className='absolute w-72 top-[-30px] left-6 bg-gray-900 text-white p-2 z-50 text-sm rounded-lg'>{tooltipText}</div>} */}
              </div>}
          </label>
          <textarea
            id={name}
            name={name}
            className={"w-full resize-none focus:outline-none text-base placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal min-h-40 " + className}
            // placeholder={placeholder}
            value={aboutTextContent}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
            onChange={handleChange}
          />
          <div className='text-right text-gray-500'>{aboutTextContent?.length || 0}/{maxLimit}</div>
        </div>
      </div>
    </>
  );
}

export default LimitedTextArea;