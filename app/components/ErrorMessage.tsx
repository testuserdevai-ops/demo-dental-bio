import React from "react";
import XIcon from "./XIcon";

type Props = { errorMessage: string; subError?: string };

export default function ErrorMessage({ errorMessage, subError }: Props) {
  return (
    <>
      <div className=" w-full mx-auto">
        <div className="border border-red-300 text-red-600 flex items-center justify-start gap-3 font-medium mx-auto py-2 px-2.5 rounded-full bg-red-100 max-w-full sm:max-w-md md:max-w-lg">
          <XIcon />
          <div className="flex flex-col items-start text-left gap-0.5 text-sm pr-3">
            <span>{errorMessage}</span>
            <span className="font-light">
              {subError ? subError : "Please try again!"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
