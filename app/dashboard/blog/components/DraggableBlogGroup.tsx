import { useDrag, useDrop } from "react-dnd";
import BlogGroup from "./BlogGroup";

const ItemType = {
  BLOG_GROUP: "BLOG_GROUP",
};

type DraggableBlogGroupProps = {
  onUpdate: ({
    id,
    name,
    enabled,
  }: {
    id: string;
    name?: string;
    enabled?: boolean;
  }) => void;
  onDelete: ({ id }: { id: string }) => void;
  blogGroup: BlogGroupType;
  index: number;
  moveBlogGroup: any;
  enabled: boolean;
};

const DraggableBlogGroup: React.FC<DraggableBlogGroupProps> = ({
  onUpdate,
  onDelete,
  blogGroup,
  index,
  moveBlogGroup,
  enabled,
}) => {
  const [, ref] = useDrag({
    type: ItemType.BLOG_GROUP,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemType.BLOG_GROUP,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveBlogGroup(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={
        enabled
          ? (node) => {
              if (node) ref(node);
              drop(node);
            }
          : undefined
      }
    >
      <BlogGroup
        onUpdate={onUpdate}
        onDelete={onDelete}
        enabled={enabled}
        group={blogGroup}
      />
    </div>
  );
};

export default DraggableBlogGroup;
