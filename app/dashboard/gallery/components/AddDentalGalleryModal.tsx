import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";
import { gallerySchema, zodFieldErrors } from "@/lib/validation";

interface AddDentalGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    title: string;
    before_image: File | null;
    after_image: File | null;
    before_image_label: string;
    after_image_label: string;
  }) => void;
}

const AddDentalGalleryModal: React.FC<AddDentalGalleryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    before_image: null,
    after_image: null,
    before_image_label: "",
    after_image_label: "",
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      title: "",
      before_image: null,
      after_image: null,
      before_image_label: "",
      after_image_label: "",
    });
    setIsUploading(false);
    setErrors({});

    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
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

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = gallerySchema.safeParse({
      title: formData.title,
      before_image_label: formData.before_image_label,
      after_image_label: formData.after_image_label,
    });

    const newErrors: Record<string, string> = result.success
      ? {}
      : zodFieldErrors(result.error);

    if (!formData.before_image) {
      newErrors.before_image = "Before image is required";
    }
    if (!formData.after_image) {
      newErrors.after_image = "After image is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUploading(true);
    onSubmit(formData);
  };

  const handleFileChange = (image: File, isAfter: boolean) => {
    const name = isAfter ? "after_image" : "before_image";
    setFormData((prevState) => ({
      ...prevState,
      [name]: image,
    }));
  };

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-gallery-title"
          className={`modal-overlay cursor-pointer fixed bg-overlay z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center animate-fade-in-short`}
          onMouseDown={onClose}
        >
          <div
            className="w-[600px] rounded-[26px] cursor-auto bg-surface p-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h4 id="add-gallery-title" className="mb-6">
              Add New Gallery
            </h4>
            <form onSubmit={handleSubmit}>
              <div className="flex-col-gap max-h-[70vh] px-1 overflow-y-auto">
                <LabeledInput
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => {
                    handleChange(e);
                    errors.title &&
                      setErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  error={errors.title}
                />
                <LabeledInput
                  label="Before Image Label"
                  name="before_image_label"
                  value={formData.before_image_label}
                  onChange={(e) => {
                    handleChange(e);
                    errors.before_image_label &&
                      setErrors((prev) => ({
                        ...prev,
                        before_image_label: "",
                      }));
                  }}
                  error={errors.before_image_label}
                />
                <div>
                  <ImageUploader
                    id="before_image"
                    text="Add before image"
                    onFileChange={(image) => {
                      handleFileChange(image, false);
                      errors.before_image &&
                        setErrors((prev) => ({ ...prev, before_image: "" }));
                    }}
                  />
                  {errors.before_image && (
                    <p
                      id="before_image-error"
                      role="alert"
                      className="text-red-500 text-sm mt-1 pl-4"
                    >
                      {errors.before_image}
                    </p>
                  )}
                </div>
                <LabeledInput
                  label="After Image Label"
                  name="after_image_label"
                  value={formData.after_image_label}
                  onChange={(e) => {
                    handleChange(e);
                    errors.after_image_label &&
                      setErrors((prev) => ({ ...prev, after_image_label: "" }));
                  }}
                  error={errors.after_image_label}
                />
                <div>
                  <ImageUploader
                    id="after_image"
                    text="Add after image"
                    onFileChange={(image) => {
                      handleFileChange(image, true);
                      errors.after_image &&
                        setErrors((prev) => ({ ...prev, after_image: "" }));
                    }}
                  />
                  {errors.after_image && (
                    <p
                      id="after_image-error"
                      role="alert"
                      className="text-red-500 text-sm mt-1 pl-4"
                    >
                      {errors.after_image}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isUploading} type="submit">
                  Add Gallery
                </FullRoundedButton>
                <FullRoundedButton
                  type="button"
                  buttonType="danger"
                  onClick={onClose}
                >
                  Close
                </FullRoundedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddDentalGalleryModal;
