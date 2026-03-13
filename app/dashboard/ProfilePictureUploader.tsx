"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { TrashSimple, UploadSimple } from "@phosphor-icons/react";
import Cropper from "react-easy-crop";
import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid"; // Import UUID
import IconButton from "./components/IconButton";
import { CircleHalf, Crop, Drop, PlusMinus, Sun } from "@phosphor-icons/react/dist/ssr";
import { ExposureFilter } from "./filter/ExposureFilter";
import { usePreview } from "../contexts/PreviewContext";
import ConfirmMessage from "../components/Modal/ConfirmMessage";

export default function ProfilePictureUploader({
  dentistryId,
}: {
  dentistryId: string;
}) {
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  const { triggerReload } = usePreview();
  const [showDeleteMessageOpen, setShowDeleteMessageOpen] = useState<boolean>(false);

  // State variables for cropping functionality
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<fabric.Image | null>(null);
  const [filterId, setFilterId] = useState<number>(0);
  const [filterValueArr, setFilterValueArr] = useState([1, 0, 0, 0, 0]);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (dentistryId) {
      fetchProfilePicture();
    }
  }, [dentistryId]);

  // Fetch existing profile picture
  async function fetchProfilePicture() {
    try {
      const { data, error } = await supabase.storage
        .from("profile-pics")
        .list(dentistryId);

      if (error) throw error;

      if (data.length > 0) {
        const sortedFiles = data.sort((a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );

        const latestFile = sortedFiles[0];
        const fileName = latestFile.name;

        const { data: urlData } = supabase.storage
          .from("profile-pics")
          .getPublicUrl(`${dentistryId}/${fileName}`);

        setProfilePicUrl(
          urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null
        );
      } else {
        setProfilePicUrl(null);
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  }

  // Handle file selection and open crop modal
  function handleProfilePicUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const canvas = new fabric.Canvas('canvas', {
      width: 600,
      height: 400,
    });
    canvasRef.current = canvas;

    const file = event.target.files?.[0];
    if (!file || !dentistryId) return;

    // Read the image file and get the data URL
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setOriginalImageSrc(reader.result as string);
      setFilterId(0);
      setFilterValueArr([1, 0, 0, 0, 0]);
      setShowCropModal(true);

      const imgElement = new Image();
      imgElement.src = reader.result as string;
      imgElement.onload = () => {
        setImageObj(new fabric.Image(imgElement));
      }
    };
  }

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // Function to create an image object
  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: any
  ): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx?.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // As a File
    return new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Canvas is empty");
          reject(new Error("Canvas is empty"));
          return;
        }
        const file = new File([blob], "profile-pic.webp", { type: "image/png" });
        resolve(file);
      }, "image/png");
    });
  }

  function resizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = reject;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions while preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              reject("Image compression failed");
            }
          },
          "image/jpeg",
          quality // 0.0 - 1.0
        );
      };

      reader.readAsDataURL(file);
    });
  }


  async function handleCropAndUpload() {
    try {
      setUploading(true);

      const croppedImageFile = await getCroppedImg(
        imageSrc!,
        croppedAreaPixels
      );

      const resizedImage = await resizeImage(croppedImageFile, 800, 800, 0.7);

      setShowCropModal(false);

      // Delete existing profile pictures before uploading the new one
      await deleteProfilePicture();

      // Generate a unique filename with timestamp or UUID
      const uniqueFileName = `profile-pic-${Date.now()}.webp`;
      // Alternatively, use UUID: const uniqueFileName = `profile-pic-${uuidv4()}.webp`;

      // Upload the cropped image to the designated folder (dentistryId)
      const { error: uploadError } = await supabase.storage
        .from("profile-pics")
        .upload(`${dentistryId}/${uniqueFileName}`, resizedImage, {
          cacheControl: "3600",
          upsert: true, // Replace existing file if same name
        });

      if (uploadError) throw uploadError;

      // Fetch and update the profile pic URL after upload
      fetchProfilePicture();

      // Close the modal and clear selected image
      setImageSrc(null);

      triggerReload();

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
    } finally {
      setUploading(false);
    }
  }

  // Delete the existing profile pictures
  async function deleteProfilePicture() {
    try {
      // List and delete all existing profile pictures
      const { data, error } = await supabase.storage
        .from("profile-pics")
        .list(dentistryId);

      if (error) throw error;

      if (data.length > 0) {
        const fileNames = data.map((file) => `${dentistryId}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from("profile-pics")
          .remove(fileNames);

        if (deleteError) throw deleteError;

        setProfilePicUrl(null); // Clear the URL after deletion
      }

      triggerReload();
    } catch (error) {
      console.error("Error deleting profile picture:", error);
    }
  }

  const applyFilters = () => {
    if (!(filterValueArr[1] || filterValueArr[2] || filterValueArr[3] || filterValueArr[4])) {
      setImageSrc(originalImageSrc);
      return;
    }

    const fabricImage = new fabric.Image(imageObj?.getElement()!);

    if (filterValueArr[1] !== 0) {
      const brightnessFilter = new fabric.Image.filters.Brightness({ brightness: filterValueArr[1] });
      fabricImage?.filters!.push(brightnessFilter);
    }
    if (filterValueArr[2] !== 0) {
      const contrastFilter = new fabric.Image.filters.Contrast({ contrast: filterValueArr[2] });
      fabricImage?.filters!.push(contrastFilter);
    }
    if (filterValueArr[3] !== 0) {
      const saturationFilter = new fabric.Image.filters.Saturation({ saturation: filterValueArr[3] });
      fabricImage?.filters!.push(saturationFilter);
    }
    if (filterValueArr[4] !== 0) {
      const brightnessFilter = new fabric.Image.filters.Brightness({ brightness: filterValueArr[4] * 0.2 });
      const contrastFilter = new fabric.Image.filters.Contrast({ contrast: (filterValueArr[4] * 0.05) });

      fabricImage?.filters!.push(brightnessFilter);
      fabricImage?.filters!.push(contrastFilter);
    }
    fabricImage?.applyFilters();
    setImageSrc(getImageFromFabricObject(fabricImage!)!);
  }

  const getImageFromFabricObject = (imageObj: fabric.Image) => {
    if (imageObj) {
      // Get the underlying HTML <img> element from the fabric.Image object
      const imgElement = imageObj.getElement();

      // Optionally, you can convert the image to a data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;
        ctx.drawImage(imgElement, 0, 0);
        const dataURL = canvas.toDataURL();
        return dataURL;
      }
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filterValueArr])

  const setFilterValue = (id: number, newValue: number) => {
    setFilterValueArr((prevState) => {
      const updatedArr = prevState.map((oriValue, index) => (index === id ? newValue : oriValue));
      return updatedArr;
    });

  }

  const filterIdChangeHandle = (id: number) => {
    if (sliderRef.current)
      if (id === 0) {
        sliderRef.current.min = "1";
        sliderRef.current.max = "3";
      } else {
        sliderRef.current.min = "-1";
        sliderRef.current.max = "1";
      }

    setFilterId(id);
  }

  return (
    <div className="profile-pic-uploader text-center">
      <h2 className="text-lg font-semibold mb-3">Profile Picture</h2>

      <div className="relative group w-32 h-32 mx-auto">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300">
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt="Profile Picture"
              className="w-full h-full object-cover"
              defaultValue={"/placeholder.webp"}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-gray-200"
              style={{
                backgroundImage: `url("/placeholder.webp")`,
                backgroundSize: "cover",
              }}
            ></div>
          )}
        </div>

        {/* Hover Overlay */}
        <label
          className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-full z-10"
          htmlFor="profile-upload"
          style={{
            backgroundColor: "rgba(17, 24, 39, 0.2)", // neutral-900 with 20% opacity
            opacity: "0",
            transition: "opacity 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        >
          <UploadSimple size={32} className="text-white" />
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            onChange={handleProfilePicUpload}
            disabled={uploading}
            className="hidden"
            ref={fileInputRef}
          />
        </label>

        <label
          className="
            absolute w-full -mt-6 py-1 flex items-end justify-center cursor-pointer
            font-bold rounded-full z-10 bg-white
            transition-all duration-300
            hover:bg-gray-50 hover:shadow-md hover:scale-[1.03]
          "
          htmlFor="profile-upload"
        >
          Upload Photo
        </label>

        {/* Trash Icon */}
        {profilePicUrl && (
          <button
            className="absolute top-1 left-1 bg-primary-1 text-white p-0.5 rounded-full z-20"
            onClick={() => setShowDeleteMessageOpen(true)}
          >
            <TrashSimple size={20} />
          </button>
        )}
      </div>

      {<p className="mt-6 text-sm text-gray-500">{uploading ? "Uploading..." : "Adding a photo helps people recognise you."}</p>}

      <ConfirmMessage
        title="Remove Profile Photo"
        description="Are you sure you want to delete your profile photo? This action cannot be undone."
        isOpen={showDeleteMessageOpen}
        onClose={() => setShowDeleteMessageOpen(false)}
        onOk={deleteProfilePicture}
        okText="Remove"
        type="danger"
      />

      {/* Modal for cropping */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg">
            <div className="bg-[#313338] rounded-t-lg p-4 relative w-[350px] sm:w-[425px] md:w-[640px]">
              <div
                className="relative w-full h-[400px] rounded-md"
              >
                <canvas id="canvas" />
                <Cropper
                  image={imageSrc!}
                  crop={crop}
                  zoom={filterValueArr[0]}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={(zoom) => setFilterValue(0, zoom)}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="mt-4 flex flex-col items-center">
                <input
                  ref={sliderRef}
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={filterValueArr[filterId]}
                  onChange={(e) => setFilterValue(filterId, Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "#5046db" }}
                />

                <div className="w-full my-2 flex justify-around">
                  <IconButton name="Crop" onClick={() => filterIdChangeHandle(0)} actived={filterId === 0}>
                    <Crop
                      size={28}
                      color="white"
                    />
                  </IconButton>
                  <IconButton name="Brightness" onClick={() => filterIdChangeHandle(1)} actived={filterId === 1}>
                    <Sun
                      size={28}
                      color="white"
                    />
                  </IconButton>
                  <IconButton name="Contrast" onClick={() => filterIdChangeHandle(2)} actived={filterId === 2}>
                    <Drop
                      size={28}
                      color="white"
                    />
                  </IconButton>
                  <IconButton name="Saturation" onClick={() => filterIdChangeHandle(3)} actived={filterId === 3}>
                    <CircleHalf
                      size={28}
                      color="white"
                    />
                  </IconButton>
                  <IconButton name="Exposure" onClick={() => filterIdChangeHandle(4)} actived={filterId === 4}>
                    <PlusMinus
                      size={28}
                      color="white"
                    />
                  </IconButton>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 rounded-b-lg p-4 w-full bg-[#2B2D31]">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc(null);
                  // Reset the file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="text-white px-4 py-2 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCropAndUpload}
                className="bg-primary-1 rounded-full text-white px-4 py-2 font-bold"
                disabled={uploading}
              >
                Apply
              </button>
            </div>


          </div>
        </div>
      )}
    </div>
  );
}
