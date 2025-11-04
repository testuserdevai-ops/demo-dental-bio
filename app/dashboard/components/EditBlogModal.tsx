// components/AddBlogModa.tsx

import { useEffect, useState } from "react";
import LabeledInput from "./LabeledInput";
import LimitedTextArea from "./LimitedTextArea";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import ImageUploader from "./ImageUploader";
import { convertToSlug } from "@/utils/convertToSlug";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import('@/app/components/TextEditor/RichTextEditor'), { ssr: false });
interface ModalProps extends BlogType {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (blog: BlogType, image: File | null) => void;
}

const EditBlogModal: React.FC<ModalProps> = ({
  username,
  isOpen,
  onClose,
  onSubmit,
  ...props
}) => {
  const [prefix, setPrefix] = useState<string>(`https://dental.bio/${username}/blog/`);
  const [formData, setFormData] = useState<BlogType>(props);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string | null>(props.image_url!);

  useEffect(() => {
    setCurrentImage(props.image_url!);

    setSelectedImage(null);
    setIsUploading(false);
    setFormData(props);

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

  const handleContentChange = (value: string) => {
    setFormData((prevState) => ({
      ...prevState,
      content: value,
    }));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updateData = { [name]: value }
    if (name === "title") {
      if (value.includes(formData.meta_title!))
        updateData = {
          ...updateData,
          meta_title: value
        };
      updateData = {
        ...updateData,
        slug: prefix + convertToSlug(value)
      };
    } else if (name === "content" && formData.meta_description === "") {
      updateData = {
        ...updateData,
        meta_description: value.slice(0, 200)
      };
    }
    setFormData((prevState) => ({
      ...prevState,
      ...updateData
    }));

  };

  const handleChangeSlug = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Ensure the input always starts with the prefix
    if (!value.startsWith(prefix)) {
      setFormData((prevState) => ({
        ...prevState,
        slug: prefix
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        slug: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    onSubmit(formData, selectedImage);
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
            className="w-[600px] max-h-[90vh] cursor-auto overflow-hidden flex flex-col rounded-[26px] bg-[#F3F3F1] p-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h4 className="mb-4">Add New Blog</h4>
            <form onSubmit={handleSubmit} className="flex-col-gap">
              <div className="max-h-[60vh] overflow-y-auto">
                <LabeledInput
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
                <RichTextEditor
                  value={formData.content!}
                  onChange={handleContentChange} />
                <ImageUploader
                  onFileChange={handleFileChange}
                  image_url={currentImage!}
                />
                <LabeledInput
                  label="Meta Title"
                  name="meta_title"
                  tooltip={true}
                  tooltipText="The Meta Title is the main heading that appears in search results. Keep it concise, under 60 characters."
                  value={formData.meta_title}
                  onChange={handleChange}
                />
                <LimitedTextArea
                  placeholder="Meta Description"
                  name="meta_description"
                  tooltip={true}
                  tooltipText="The Meta Description provides a summary for search engines. Keep it between 50-200 characters."
                  value={formData.meta_description}
                  limit={300}
                  onChange={handleChange}
                />
                <LabeledInput
                  label="URL"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChangeSlug}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isUploading} type="submit">Update Blog</FullRoundedButton>
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>Close</FullRoundedButton>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
};

export default EditBlogModal;
