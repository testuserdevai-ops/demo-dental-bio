'use client'

import { CaretDownIcon, CaretUpIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useReducer, useState } from "react";
import LabeledInput from "../../components/LabeledInput";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import BaseCard from "@/app/components/Card/BaseCard";
import { groupNameSchema, zodFieldErrors } from "@/lib/validation";


type BlogGroupProps = {
  enabled: boolean;
  onUpdate: ({ id, name, enabled }: { id: string, name?: string, enabled?: boolean }) => void;
  onDelete: ({ id }: { id: string }) => void;
  group: BlogGroupType;
}

const BlogGroup: React.FC<BlogGroupProps> = ({
  enabled,
  onUpdate,
  onDelete,
  group,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, group.enabled!);
  const [heading, setHeading] = useState<string>(group.name || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (group.enabled !== isActive) {
      onUpdate({ id: group.id, enabled: isActive });
    }
  }, [isActive])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = groupNameSchema.safeParse({ name: heading });
    if (!validation.success) {
      setErrors(zodFieldErrors(validation.error));
      return;
    }

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
              onChange={(e) => { setHeading(e.target.value); errors.name && setErrors((prev) => ({ ...prev, name: "" })); }}
              error={errors.name}
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
          movable
          handleType="caret"
          className="bg-accent-blue-muted"
          disabled={!enabled}
          showDelete
          onConfirmDelete={handleDelete}
          deleteConfirmTitle="Delete group?"
          deleteConfirmDescription="Are you sure you want to delete the group?"
          deleteOkText="Delete"
          showEnable
          isEnabled={isActive}
          onToggleEnabled={toggleIsActive}
        >
          {/* Title and Content */}
          <div className="flex-grow text-[14px] overflow-hidden">
            {/* Title Row */}
            <div className="flex flex-1 items-center justify-center truncate gap-2">
              <div className="text-primary-1 font-bold truncate">{group.name}</div>
              <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => { setErrors({}); setIsEditing(true); }} disabled={!enabled}>
                <PencilSimpleIcon
                  size={18}
                />
              </button>
            </div>

            {/* Content Row */}
            {/* <div className="truncate" dangerouslySetInnerHTML={{__html: content!}} /> */}
          </div>
        </BaseCard>}
    </div>
  )
}

export default BlogGroup;