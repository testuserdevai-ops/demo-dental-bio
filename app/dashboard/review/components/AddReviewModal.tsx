// components/AddReviewModa.tsx

import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";
import LimitedTextArea from "../../components/LimitedTextArea";
import ReactStars from "react-stars";
import CustomInput from "../../../register/CustomInput";
import "react-day-picker/dist/style.css";
import { reviewSchema } from "@/lib/validation";
import { showErrorToast } from "@/utils/Toast";

type ModalProps = ReviewType & {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (formData: ReviewType, image_file: File | null) => void;
  onEdit?: (formData: ReviewType, image_file: File | null) => void;
}

const AddReviewModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onEdit,
  ...props
}) => {
  const [formData, setFormData] = useState<ReviewType>({
    reviewer_name: "",
    stars: 5,
    content: "",
    image_url: "",
    created_at: new Date(),
    platform: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (props.id) {
      setFormData(props);
    } else {
      setFormData({
        reviewer_name: "",
        stars: 5,
        content: "",
        image_url: "",
        created_at: new Date(),
        platform: "",
      });
    }

    setSelectedImage(null);
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
      [name]: value
    }));
  };

  const handleStarsChange = (stars: number) => {
    setFormData((prevState) => ({
      ...prevState,
      stars
    }));
  }

  const handleDateChange = (date: Date | null) => {
    setFormData((prevState) => ({
      ...prevState,
      created_at: date,
    }));
  }

  const handleSubmit = () => {
    const validation = reviewSchema.safeParse({
      reviewer_name: formData.reviewer_name,
      content: formData.content,
      stars: formData.stars,
      platform: formData.platform,
    });

    if (!validation.success) {
      showErrorToast(validation.error.issues[0].message);
      return;
    }

    setIsUploading(true);
    if (props.id && onEdit)
      onEdit({ ...props, ...formData }, selectedImage);
    else if (onCreate)
      onCreate(formData, selectedImage);
  };

  const handleFileChange = (image: File) => {
    setSelectedImage(image);
  }

  return (
    <>
      {isOpen &&
        <div
          className={`modal-overlay overflow-auto fixed bg-[#00000080] cursor-pointer z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={onClose}
        >
          <div
            className="w-[600px] overflow-hidden cursor-auto flex flex-col rounded-[26px] bg-[#F3F3F1] p-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h4 className="mb-4">Add New Review</h4>
            <form action={handleSubmit}>
              <div className="flex-col-gap max-h-[70vh] overflow-y-auto pt-3">
                <LabeledInput
                  label="Reviewer Name"
                  name="reviewer_name"
                  value={formData.reviewer_name}
                  onChange={handleChange}
                  required
                />
                <LimitedTextArea
                  placeholder="Review Content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  limit={500}
                  required
                />
                <div className="relative flex-grow">
                  <div className="rounded-[26px] bg-white pt-[20px] pb-2 px-4 h-[50px] flex items-center cursor-pointer" onClick={() => setShowCalendar(true)}>
                    <label
                      htmlFor="created_at"
                      className={`absolute flex items-center gap-1 top-[12px] text-gray-500 transition-all duration-100 ease-linear transform cursor-pointer -translate-y-[7px] text-xs`}
                      onClick={e => { e.stopPropagation(); setShowCalendar(true); }}
                    >
                      Date
                    </label>
                    <CustomInput
                      type="date"
                      value={formData.created_at ? (typeof formData.created_at === 'string' ? formData.created_at : `${String(formData.created_at.getDate()).padStart(2, "0")}/${String(formData.created_at.getMonth() + 1).padStart(2, "0")}/${formData.created_at.getFullYear()}`) : ""}
                      onDateValueChange={(v) => setFormData(prev => ({ ...prev, created_at: v }))}
                      placeholder="Select Date"
                      variant="unstyled"
                      containerClassName="w-full"
                      dateGroupClassName="w-full bg-transparent text-neutral-800 outline-none cursor-pointer"
                      dateSegmentClassName="text-base"
                      dateSeparatorClassName="text-neutral-500"
                      calendarWrapperClassName="left-1/2 -translate-x-1/2"
                      showFormatHint={false}
                    />
                  </div>
                </div>
                <ReactStars
                  count={5}
                  size={80}
                  color2={"#ffd700"}
                  half={false}
                  value={formData.stars}
                  onChange={handleStarsChange}
                  className="flex justify-around react-star"
                />
                <ImageUploader
                  image_url={formData.image_url}
                  onFileChange={handleFileChange}
                  text="Add Photo (optional)"
                />
                <LabeledInput
                  label="Review Platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isUploading} type="submit">
                  {props.id ? "Update" : "Add"} Review
                </FullRoundedButton>
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>
                  Close
                </FullRoundedButton>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
};

export default AddReviewModal;
