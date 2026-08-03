import React from "react";

interface ConfirmDeleteProps {
  onConfirm: () => void;
  onCancel: () => void;
  groupTitle: string;
  links: any[];
}

const ConfirmDeletePopup: React.FC<ConfirmDeleteProps> = ({
  onConfirm,
  onCancel,
  groupTitle,
  links,
}) => {
  return (
    <div className="fixed inset-0  bg-neutral-900 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-[32px] shadow-md max-w-lg w-full">
        <h3 className="text-lg text-neutral-800 mb-4">
          Are you sure you want to delete the group{" "}
          <span className=" font-bold text-black">"{groupTitle}"</span> and the
          following links?
        </h3>
        <ul className="list-disc pl-5 mb-4">
          {links.map((link) => (
            <li key={link.link_id}>{link.title}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="bg-neutral-500 hover:bg-neutral-400 text-white py-1.5 px-4 rounded-[26px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white py-1.5 px-4 rounded-[26px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeletePopup;
