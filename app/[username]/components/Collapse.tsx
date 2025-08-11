import { Minus, Plus } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';

interface CollapseProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Collapse: React.FC<CollapseProps> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className="w-full overflow-hidden text-left px-1 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className='text-5 text-[#5046DD] truncate'>{title}</span>
          <span>
            {isOpen ? <Minus size={20} /> : <Plus size={20} />}
          </span>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 ease-in' : 'max-h-0 ease-out'}`}
      >
        <div className="p-1 text-left break-words whitespace-normal">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapse;
