import { useDrag, useDrop } from 'react-dnd';
import BlogImage from '@/app/components/Image/BlogImage';
import { PencilSimple, Trash, DotsSixVertical } from '@phosphor-icons/react/dist/ssr';
import Switcher from '@/app/components/Switcher';
import ConfirmMessage from '@/app/components/Modal/ConfirmMessagel';
import React, { useState, useEffect } from 'react';

const ItemType = {
  GENERAL_GALLERY: 'GENERAL_GALLERY',
};

type GeneralGalleryType = {
  id: string;
  user_id?: string;
  title?: string;
  image_url?: string;
  rank?: number;
  enabled?: boolean;
};

type DraggableGeneralGalleryCardProps = {
  gallery: GeneralGalleryType;
  index: number;
  moveGallery: (from: number, to: number) => void;
  enabled: boolean;
  onEditItem?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (gallery: GeneralGalleryType) => void;
};

const DraggableGeneralGalleryCard: React.FC<DraggableGeneralGalleryCardProps> = ({
  gallery,
  index,
  moveGallery,
  enabled,
  onEditItem,
  onDelete,
  onUpdate,
}) => {
  const [, ref] = useDrag({
    type: ItemType.GENERAL_GALLERY,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemType.GENERAL_GALLERY,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveGallery(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(gallery.enabled ?? true);

  useEffect(() => {
    setIsActive(gallery.enabled ?? true);
  }, [gallery.enabled]);

  const handleDelete = () => {
    if (onDelete) onDelete(gallery.id);
  };

  const handleToggle = () => {
    const next = !isActive;
    setIsActive(next);
    if (onUpdate && gallery.enabled !== next) {
      onUpdate({ ...gallery, enabled: next });
    }
  };

  return (
    <>
      <div
        ref={enabled ? (node) => {
          if (node) ref(node);
          drop(node);
        } : undefined}
        className="w-full p-6 shadow rounded-[26px] flex overflow-hidden gap-4 mb-4 bg-white"
      >
        <div className="flex-grow flex flex-col items-center">
          <div className="w-full flex items-center h-8 mb-4">
            <div className="flex-grow text-[14px] overflow-hidden">
              <div className="flex flex-1 items-center truncate gap-2">
                <div className="flex flex-col justify-center mr-2 cursor-move text-gray-400">
                  <DotsSixVertical size={22} />
                </div>
                <div className="text-primary-1 font-bold truncate">{gallery.title}</div>
                {onEditItem && (
                  <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(gallery.id)} disabled={!enabled}>
                    <PencilSimple size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDelete && (
                <button onClick={() => setIsOpenConfirmMessage(true)} className="enabled:hover:text-red-700" disabled={!enabled}>
                  <Trash size={20} />
                </button>
              )}
              {onUpdate && (
                <Switcher isChecked={isActive} onToggle={handleToggle} disabled={!enabled} />
              )}
            </div>
          </div>
          <div className="w-full">
            <BlogImage src={gallery.image_url!} className="aspect-square rounded-[6px] w-full" />
          </div>
        </div>
      </div>
      <ConfirmMessage
        description="Are you sure you want to delete the general gallery?"
        okText="Delete"
        isOpen={isOpenConfirmMessage}
        onClose={() => setIsOpenConfirmMessage(false)}
        onOk={handleDelete}
      />
    </>
  );
};

export default DraggableGeneralGalleryCard; 