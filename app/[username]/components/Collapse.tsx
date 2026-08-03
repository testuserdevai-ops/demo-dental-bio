import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import type { TrackableAction } from "@/features/analytics/contract";
import { TrackedButton } from "@/features/analytics/tracked-action";

interface CollapseProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  analytics: TrackableAction;
  children: React.ReactNode;
}

const Collapse: React.FC<CollapseProps> = ({
  title,
  isOpen,
  onToggle,
  analytics,
  children,
}) => {
  return (
    <div className="w-full">
      <TrackedButton
        onClick={onToggle}
        analytics={isOpen ? [] : analytics}
        aria-expanded={isOpen}
        className="w-full overflow-hidden text-left px-1 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-5 text-primary-1 truncate">{title}</span>
          <span>{isOpen ? <Minus size={20} /> : <Plus size={20} />}</span>
        </div>
      </TrackedButton>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="p-1 text-left break-words whitespace-normal">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collapse;
