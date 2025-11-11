const SkeletonLoader = () => {
  return (
    <div className="membar-cards animate-pulse p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0 bg-neutral-100 rounded-md w-10 h-16"></div>
        <div className="w-full">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="bg-neutral-100 w-3/5 h-6 rounded-md mb-2"></div>
            <div className="bg-neutral-100 w-1/5 h-6 rounded-md"></div>
          </div>
          <div className="bg-neutral-100 w-full h-5 rounded-md"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;