"use client";
import { useRef, useState } from "react";
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
import { Input } from "@/app/components/ui/input";
import SafeImage from "@/app/components/Image/SafeImage";
import type { ProfileViewModel } from "../_lib/profile/queries";
import {
  deleteProfilePicture,
  uploadProfilePicture,
} from "../_lib/profile/uploads";

export default function ProfilePictureEditor({
  dentistryId,
  value,
  onChanged,
}: {
  dentistryId: string;
  value: ProfileViewModel["profilePicture"];
  onChanged(value: ProfileViewModel["profilePicture"]): void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError("");
    setStatus("");
    const result = await uploadProfilePicture(dentistryId, file);
    setPending(false);
    if (!result.ok) setError(result.formError ?? "Unable to upload image");
    else {
      onChanged(result.data);
      setStatus("Profile picture uploaded");
    }
    if (inputRef.current) inputRef.current.value = "";
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
            onChange={(event) => void upload(event.target.files?.[0])}
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
                      setPending(false);
                      if (!result.ok)
                        setError(result.formError ?? "Unable to delete image");
                      else {
                        onChanged({ objectPath: null, publicUrl: null });
                        setStatus("Profile picture deleted");
                      }
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
    </section>
  );
}
