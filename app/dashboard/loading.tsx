import React from "react";
import SkeletonLoader from "../components/Loader/SkeletonLoader";

export default function Loading() {
  return (
    <div>
      <div id="columns">
        <div className="animate-pulse rounded-full bg-white mb-10 w-32 h-32 aspect-square mx-auto flex items-center justify-center">
          <div className="rounded-full bg-neutral-100 w-28 h-28 aspect-square"></div>
        </div>
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
      </div>
    </div>
  );
}
