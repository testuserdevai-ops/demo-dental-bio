"use client";

import { Trash } from "@phosphor-icons/react";
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

type DeleteBioProps = {
  targetUserId?: string | null;
  handleDelete: (userId: string) => void;
};

export default function DeleteBio({
  targetUserId,
  handleDelete,
}: DeleteBioProps) {
  return (
    <section className="rounded-3xl border border-destructive/30 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-dark">Delete this Bio</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Once you delete your bio, it cannot be recovered.
      </p>
      <div className="mt-4 flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              <Trash aria-hidden="true" className="size-5" />
              Delete Bio
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bio?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your bio? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(targetUserId || "")}
              >
                Delete bio
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
