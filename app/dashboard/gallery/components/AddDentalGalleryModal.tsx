import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";

interface AddDentalGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { title: string; before_image: File | null; after_image: File | null; before_image_label: string; after_image_label: string; }) => void;
}

const AddDentalGalleryModal: React.FC<AddDentalGalleryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: "",
    before_image: null,
    after_image: null,
    before_image_label: "",
    after_image_label: "",
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.before_image && formData.after_image) {
      setIsUploading(true);
      onSubmit(formData);
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
          className={`modal-overlay cursor-pointer fixed bg-overlay z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center animate-fade-in-short`}
          onMouseDown={onClose}
        >
          <div className="w-[600px] rounded-[26px] cursor-auto bg-surface p-10" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="mb-6">Add New Gallery</h4>
            <form onSubmit={handleSubmit}>
              <div className="flex-col-gap max-h-[70vh] overflow-y-auto">
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
                <FullRoundedButton isLoading={isUploading} type="submit">Add Gallery</FullRoundedButton>
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>Close</FullRoundedButton>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
};

export default AddDentalGalleryModal; 