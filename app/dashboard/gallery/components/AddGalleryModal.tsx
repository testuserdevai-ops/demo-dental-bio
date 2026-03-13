// components/AddGalleryModa.tsx

import { useEffect, useState, useReducer } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";
import TooltipSwitcher from "../../../components/TooltipSwitcher";
import { gallerySchema } from "@/lib/validation";
import { showErrorToast } from "@/utils/Toast";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { title: string; before_image: File | null; after_image: File | null, before_image_label: string; after_image_label: string; }) => void;
  onGeneralSubmit: (formData: { title: string; before_image: File | null; }) => void;
}

const AddGalleryModal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, onGeneralSubmit }) => {
  const [formData, setFormData] = useState<{
    title: string;
    before_image: File | null;
    after_image: File | null;
    before_image_label: string;
    after_image_label: string;
  }>({
    title: "",
    before_image: null,
    after_image: null,
    before_image_label: "",
    after_image_label: "",
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isGeneral, toggleIsGeneral] = useReducer((state) => !state, false);

  useEffect(() => {
    setFormData({
      title: "",
      before_image: null,
      after_image: null,
      before_image_label: "",
      after_image_label: "",
    });
    setIsUploading(false);

    if (isOpen) {
      // Get the scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Prevent scrolling and adjust padding
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // Restore styles
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = gallerySchema.safeParse({
      title: formData.title,
      before_image_label: isGeneral ? undefined : formData.before_image_label,
      after_image_label: isGeneral ? undefined : formData.after_image_label,
    });

    if (!validation.success) {
      showErrorToast(validation.error.issues[0].message);
      return;
    }

    if ((isGeneral && formData.before_image) || (formData.before_image && formData.after_image)) {
      setIsUploading(true);
      
      if (isGeneral) {
        onGeneralSubmit(formData);
      } else {
        onSubmit(formData);
      }
      return;
    } else {

    }
  };

  const handleFileChange = (image: File, isAfter: boolean) => {
    const name = isAfter ? "after_image" : "before_image";
    setFormData((prevState) => ({
      ...prevState,
      [name]: image
    }))
  }

  return (
    <>
      {isOpen &&
        <div
          className={`modal-overlay cursor-pointer fixed bg-overlay z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={onClose}
        >
          <div className="w-[600px] rounded-[26px] cursor-auto bg-surface p-10" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h4>Add New Gallery</h4>
              <TooltipSwitcher
                id="add-gallery-switcher"
                labelLeft="Dentistry"
                labelRight="General"
                onToggle={toggleIsGeneral}
                isChecked={isGeneral}
              />
            </div>
            {isGeneral ?

              <form onSubmit={handleSubmit}>
                <div className="flex-col-gap max-h-[70vh] overflow-y-auto">
                  <LabeledInput
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                  <ImageUploader
                    id="before_image"
                    text="Add image"
                    onFileChange={(image) => handleFileChange(image, false)}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  {/* <SaveButton text="Add Gallery" /> */}
                  <FullRoundedButton isLoading={isUploading} type="submit">Add Gallery</FullRoundedButton>
                  <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>Close</FullRoundedButton>
                </div>
              </form> :
              <form onSubmit={handleSubmit}>
                <div className="max-h-[70vh] overflow-y-auto">
                  <LabeledInput
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                  <LabeledInput
                    label="Before Image Label"
                    name="before_image_label"
                    value={formData.before_image_label}
                    onChange={handleChange}
                    required
                  />
                  <ImageUploader
                    id="before_image"
                    text="Add before image"
                    onFileChange={(image) => handleFileChange(image, false)}
                  />
                  <LabeledInput
                    label="After Image Label"
                    name="after_image_label"
                    value={formData.after_image_label}
                    onChange={handleChange}
                    required
                  />
                  <ImageUploader
                    id="after_image"
                    text="Add after image"
                    onFileChange={(image) => handleFileChange(image, true)}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  {/* <SaveButton text="Add Gallery" /> */}
                  <FullRoundedButton isLoading={isUploading} type="submit">Add Gallery</FullRoundedButton>
                  <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>Close</FullRoundedButton>
                </div>
              </form>
            }
          </div>
        </div>}
    </>
  );
};

export default AddGalleryModal;
