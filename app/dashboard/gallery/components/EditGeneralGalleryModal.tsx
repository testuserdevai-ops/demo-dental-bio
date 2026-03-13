import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";
import { gallerySchema } from "@/lib/validation";
import { showErrorToast } from "@/utils/Toast";

interface GeneralGalleryType {
  id: string;
  user_id?: string;
  title?: string;
  image_url?: string;
  rank?: number;
  enabled?: boolean;
}

interface ModalProps extends GeneralGalleryType {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (gallery: GeneralGalleryType, image_file: File | null) => void;
}

const EditGeneralGalleryModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ...props
}) => {
  const [formData, setFormData] = useState<GeneralGalleryType>(props);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(props.image_url!);

  useEffect(() => {
    setImage(isOpen ? props.image_url! : null);
    setImageFile(null);
    setIsUploading(false);
    setFormData(props);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    });

    if (!validation.success) {
      showErrorToast(validation.error.issues[0].message);
      return;
    }

    setIsUploading(true);
    onSubmit(formData, imageFile);
  };

  const handleFileChange = (image: File) => {
    setImageFile(image);
  };

  return (
    <>
      {isOpen && (
        <div
          className={`modal-overlay cursor-pointer fixed bg-[#00000080] z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={onClose}
        >
          <div className="w-[400px] rounded-[26px] cursor-auto bg-[#F3F3F1] p-10" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="mb-4">Edit General gallery</h4>
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
                  id="general_image"
                  text="Add image"
                  onFileChange={handleFileChange}
                  image_url={image!}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isUploading} type="submit">Update Gallery</FullRoundedButton>
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>Close</FullRoundedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EditGeneralGalleryModal; 