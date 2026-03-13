'use client'

import LabeledInput from "@/app/dashboard/components/LabeledInput";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useReducer, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import BaseCard from "@/app/components/Card/BaseCard";

type BlogGroupProps = BlogGroupType & {
  onUpdate: ({ id, name, enabled }: { id: string, name?: string, enabled?: boolean }) => void;
  onDelete: ({ id }: { id: string }) => void;
  groupEnabled?: boolean;
}

const BlogGroup: React.FC<BlogGroupProps> = ({
  onUpdate,
  onDelete,
  groupEnabled = false,
  ...group
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, group.enabled!);
  const [heading, setHeading] = useState<string>(group.name || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (group.enabled !== isActive) {
      onUpdate({ id: group.id, enabled: isActive });
    }
  }, [isActive])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await onUpdate({ id: group.id, name: heading });

    setIsLoading(false);
    setIsEditing(false);
  }

  const handleDelete = () => {
    onDelete({ id: group.id });
  }

  return (
    <div>
      {isEditing ?
        <div>
          <form
            onSubmit={handleSubmit}
            className="flex-col-gap w-full mb-4"
          >
            <LabeledInput
              label="Group Title"
              name="name"
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              required
            />
            <div className="flex gap-2 pt-2 w-full justify-end">
              <FullRoundedButton
                type="submit"
                isLoading={isLoading}
              >
                Save
              </FullRoundedButton>
              <FullRoundedButton
                type="button"
                onClick={() => setIsEditing(false)}
                buttonType="ghost"
              >
                Cancel
              </FullRoundedButton>
            </div>
          </form>
        </div> :
        <BaseCard
          className="bg-accent-blue-muted !p-6"
          movable
          buttonDirection="horizontal"
          showDelete
          onConfirmDelete={handleDelete}
          deleteConfirmTitle="Delete group?"
          deleteConfirmDescription="Are you sure you want to delete the group?"
          deleteOkText="Delete"
          disabled={!groupEnabled}
          showEnable
          isEnabled={isActive}
          onToggleEnabled={toggleIsActive}
        >
          <div className="text-[14px] overflow-hidden">
            <div className="flex flex-1 items-center justify-center truncate gap-2">
              <div className="text-primary-1 font-bold truncate">{group.name}</div>
              <button onClick={() => setIsEditing(true)} className="flex-shrink-0 enabled:hover:text-primary-1" disabled={!groupEnabled}>
                <PencilSimpleIcon size={18} />
              </button>
            </div>
          </div>
        </BaseCard>}
    </div>
  )
}

export default BlogGroup;