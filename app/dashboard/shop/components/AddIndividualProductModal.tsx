// components/AddProductModal.tsx

import { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "../../components/LabeledInput";
import ImageUploader from "../../components/ImageUploader";
import { currencies } from "@/utils/global_constants";
import { CaretDown } from "@phosphor-icons/react";
import { productSchema } from "@/lib/validation";
import { showErrorToast } from "@/utils/Toast";

type ModalProps = ProductType & {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: IndividualProductType, image: File | null) => void;
}

const AddIndividualProductModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ...props
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formData, setFormData] = useState<ProductType>({
    name: "",
    link: "",
    platform: "",
    image_url: "",
    price: "",
    currency: "GBP(£)",
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (props.id) {
      setFormData(props);
    } else {
      setFormData({
        name: "",
        link: "",
        platform: "",
        image_url: "",
        price: "",
        currency: "GBP(£)",
      });
    }
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

  const handleSubmit = () => {
    const validation = productSchema.safeParse({
      name: formData.name,
      price: formData.price,
      link: formData.link,
      platform: formData.platform,
    });

    if (!validation.success) {
      showErrorToast(validation.error.issues[0].message);
      return;
    }

    setIsUploading(true);
    onSubmit(formData, selectedImage);
  };

  const handleFileChange = (image: File) => {
    setSelectedImage(image);
  }

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    console.log(value);
    setFormData((prevState) => ({
      ...prevState,
      currency: value
    }));
  }

  return (
    <>
      {isOpen &&
        <div
          className={`modal-overlay overflow-auto fixed bg-overlay cursor-pointer z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={onClose}
        >
          <div
            className="w-[600px] overflow-hidden cursor-auto flex flex-col rounded-[26px] cursor- bg-surface p-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h4 className="mb-3">{props.id ? "Edit" : "Add New"} Product</h4>
            <form action={handleSubmit}>
              <div className="flex-col-gap max-h-[70vh] overflow-y-auto">
                <LabeledInput
                  label="Name"
                  name="name"
                  value={formData.name!}
                  onChange={handleChange}
                  required

                />
                <div className="flex justify-between gap-2">
                  <LabeledInput
                    label="Price"
                    name="price"
                    type="number"
                    value={formData.price!}
                    onChange={handleChange}
                    className="no-spinner"
                    required
                  />
                  {/* Currency Dropdown */}
                  <div className="relative">
                    {/* <h2 className="text-base text-dark">Currency</h2> */}
                    <div className="relative">
                      <select
                        name="currency"
                        className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                        onChange={handleCurrencyChange}
                        value={formData.currency}
                      >
                        {currencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <CaretDown
                        size={20}
                        weight="bold"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
                      />
                    </div>
                  </div>

                </div>

                <ImageUploader
                  onFileChange={handleFileChange}
                  image_url={formData.image_url!}
                  text="Add Image (optional)"
                />

                <LabeledInput
                  label="Link"
                  name="link"
                  value={formData.link!}
                  onChange={handleChange}
                  required
                />

                <LabeledInput
                  label="Platform"
                  name="platform"
                  value={formData.platform!}
                  onChange={handleChange}
                  required
                />

              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isUploading} type="submit">
                  {props.id ? "Update" : "Add"} Product
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

export default AddIndividualProductModal;
