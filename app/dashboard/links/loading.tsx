import SkeletonLoader from "@/app/components/Loader/SkeletonLoader";
import React from "react";

export default function Loading() {
  return (
    <div >
      <div id="columns">
        <SkeletonLoader/>
        <SkeletonLoader/>
        <SkeletonLoader/>
        <SkeletonLoader/>
        <SkeletonLoader/>
      </div>
    </div>
  );
}
