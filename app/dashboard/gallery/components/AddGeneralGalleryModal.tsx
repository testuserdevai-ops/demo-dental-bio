import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";

interface AddGeneralGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { title: string; before_image: File | null; }) => void;
}

const AddGeneralGalleryModal: React.FC<AddGeneralGalleryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<{
    title: string;
    before_image: File | null;
  }>({
    title: "",
    before_image: null,
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    setFormData({
      title: "",
      before_image: null,
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
    if (formData.before_image) {
      setIsUploading(true);
      onSubmit(formData);
    }
  };

  const handleFileChange = (image: File) => {
    setFormData((prevState) => ({
      ...prevState,
      before_image: image
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
            <h4 className="mb-6">Add New General gallery</h4>
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
                  onFileChange={handleFileChange}
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

export default AddGeneralGalleryModal; 