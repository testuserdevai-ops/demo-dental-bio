'use client'
import { createClient } from "@/utils/supabase/client";
import { UploadSimple, TrashSimple, Sun, Crop, Drop, CircleHalf, PlusMinus } from "@phosphor-icons/react/dist/ssr";
import React, { ChangeEvent, ChangeEventHandler, EventHandler, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import IconButton from "./IconButton";

const CustomizedImageUploader = ({
  dentistryId,
}: {
  dentistryId: string;
}) => {
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<number>(0);
  const [filterValueArr, setFilterValueArr] = useState([1, 0, 0, 0, 0]);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (filterId == 0) {
      sliderRef.current?.min
    }
  }, [filterId])

  // Handle file selection and open crop modal
  function handleProfilePicUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !dentistryId) return;

    // Read the image file and get the data URL
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setShowCropModal(true);
    };
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
    } catch (error) {
      console.error("Error deleting profile picture:", error);
    }
  }

  const valueChangeHandle = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterValueArr(filterValueArr.map((value, index) => (index === filterId ? parseFloat(e.target.value) : value)));
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

        {/* Trash Icon */}
        {profilePicUrl && (
          <button
            className="absolute top-1 left-1 bg-red-600 text-white p-0.5 rounded-full z-20"
            onClick={deleteProfilePicture}
          >
            <TrashSimple size={20} />
          </button>
        )}
      </div>

      {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}

      {/* Modal for cropping */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-black p-4 rounded-md relative w-96">
            {/* Close button */}
            <button
              className="absolute top-2 right-3 text-white hover:text-gray-700"
              onClick={() => {
                setShowCropModal(false);
                setImageSrc(null);
                // Reset the file input
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              &#10005; {/* This is the 'X' character */}
            </button>



            <div className="mt-4 flex flex-col items-center">
              <input
                ref={sliderRef}
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={filterValueArr[filterId]}
                onChange={valueChangeHandle}
                className="w-full my-3"
                style={{ accentColor: "#5046db" }}
              />

              <div className="w-full my-2 flex justify-around">
                <IconButton name="Crop" onClick={() => setFilterId(0)} actived={filterId === 0}>
                  <Crop
                    size={28}
                    color="white"
                  />
                </IconButton>
                <IconButton name="Brightness" onClick={() => setFilterId(1)} actived={filterId === 1}>
                  <Sun
                    size={28}
                    color="white"
                  />
                </IconButton>
                <IconButton name="Contrast" onClick={() => setFilterId(2)} actived={filterId === 2}>
                  <Drop
                    size={28}
                    color="white"
                  />
                </IconButton>
                <IconButton name="Saturation" onClick={() => setFilterId(3)} actived={filterId === 3}>
                  <CircleHalf
                    size={28}
                    color="white"
                  />
                </IconButton>
                <IconButton name="Exposure" onClick={() => setFilterId(4)} actived={filterId === 4}>
                  <PlusMinus
                    size={28}
                    color="white"
                  />
                </IconButton>
              </div>

              <div className="mt-4 flex justify-between w-full">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setImageSrc(null);
                    // Reset the file input
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="border bg- border-neutral-400 rounded-full text-white px-4 py-2 font-bold"
                >
                  Cancel
                </button>
                <button
                  // onClick={handleCropAndUpload}
                  className="bg-primary-1 rounded-full text-white px-4 py-2 font-bold"
                  disabled={uploading}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomizedImageUploader;