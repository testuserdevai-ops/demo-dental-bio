"use client";
import { useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import SafeImage from "@/app/components/Image/SafeImage";
import type { ProfileViewModel } from "../_lib/profile/queries";
import { refreshProfilePicturePreview } from "../_lib/profile/actions";
import { createCroppedProfilePicture } from "../_lib/profile/crop-image";
import {
  deleteProfilePicture,
  uploadProfilePicture,
  validateProfilePicture,
} from "../_lib/profile/uploads";

export default function ProfilePictureEditor({
  dentistryId,
  targetHint,
  value,
  onChanged,
}: {
  dentistryId: string;
  targetHint: string | undefined;
  value: ProfileViewModel["profilePicture"];
  onChanged(value: ProfileViewModel["profilePicture"]): void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (cropSource) URL.revokeObjectURL(cropSource);
    },
    [cropSource],
  );

  function closeCropper() {
    setCropSource("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStatus("");
    const validationError = validateProfilePicture(file);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setCropSource(URL.createObjectURL(file));
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError("");
    setStatus("");
    const result = await uploadProfilePicture(dentistryId, file);
    if (!result.ok) setError(result.formError ?? "Unable to upload image");
    else {
      const refresh = await refreshProfilePicturePreview(targetHint);
      if (!refresh.ok) {
        onChanged(result.data);
        setError(
          refresh.formError ??
            "Profile picture was uploaded, but the preview could not be refreshed",
        );
      } else {
        onChanged(result.data);
        setStatus("Profile picture uploaded and preview refreshed");
      }
    }
    setPending(false);
    closeCropper();
  }
  return (
    <section className="flex-col-gap" aria-labelledby="profile-picture-heading">
      <h2 id="profile-picture-heading" className="text-lg font-semibold">
        Profile picture
      </h2>
      <div className="flex items-center gap-4">
        {value.publicUrl ? (
          <SafeImage
            src={value.publicUrl}
            alt="Current profile picture"
            width={112}
            height={112}
            className="size-28 rounded-full object-cover"
            unoptimized
            loader={({ src }) => src}
          />
        ) : (
          <div className="flex size-28 items-center justify-center rounded-full bg-muted text-sm">
            No photo
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            isPending={pending}
          >
            Upload picture
          </Button>
          <Input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose profile picture"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {value.publicUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost">
                  Delete picture
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete profile picture?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the current profile picture.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (event) => {
                      event.preventDefault();
                      setPending(true);
                      const result = await deleteProfilePicture(dentistryId);
                      if (!result.ok)
                        setError(result.formError ?? "Unable to delete image");
                      else {
                        const refresh =
                          await refreshProfilePicturePreview(targetHint);
                        if (!refresh.ok) {
                          onChanged({ objectPath: null, publicUrl: null });
                          setError(
                            refresh.formError ??
                              "Profile picture was deleted, but the preview could not be refreshed",
                          );
                        } else {
                          onChanged({ objectPath: null, publicUrl: null });
                          setStatus(
                            "Profile picture deleted and preview refreshed",
                          );
                        }
                      }
                      setPending(false);
                    }}
                  >
                    Delete picture
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not update profile picture</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status && <p role="status">{status}</p>}
      <Dialog
        open={Boolean(cropSource)}
        onOpenChange={(open) => {
          if (!open && !pending) closeCropper();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop profile picture</DialogTitle>
            <DialogDescription>
              Move and zoom the image to choose the square shown on your
              profile.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-80 overflow-hidden rounded-md bg-black">
            {cropSource && (
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedArea(pixels)}
              />
            )}
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Zoom
            <Input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Profile picture zoom"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropper}>
              Cancel
            </Button>
            <Button
              type="button"
              isPending={pending}
              disabled={!croppedArea}
              onClick={async () => {
                if (!croppedArea) return;
                try {
                  const file = await createCroppedProfilePicture(
                    cropSource,
                    croppedArea,
                  );
                  await upload(file);
                } catch (cropError) {
                  setError(
                    cropError instanceof Error
                      ? cropError.message
                      : "Unable to crop image",
                  );
                }
              }}
            >
              Save picture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
