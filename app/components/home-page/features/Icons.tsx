import React from "react";

type Props = {};

export default function Icons({}: Props) {
  // Define local icons data
  const icons = [
    {
      title: "Verification",
      svgPath:
        "https://cdn.prod.website-files.com/66b92aaf42a15fc71d286344/66bb1d1471a574fa68a5be57_tick.svg",
    },
    {
      title: "Tracking",
      svgPath:
        "https://cdn.prod.website-files.com/66b92aaf42a15fc71d286344/66bb1d956e92c3ad9fb7b197_Group%2038.svg",
    },
    {
      title: "Booking",
      svgPath:
        "https://cdn.prod.website-files.com/66b92aaf42a15fc71d286344/66bb1db23959075b9bdc5244_Group%2039.svg",
    },
  ];

  return (
    <div className="flex justify-center items-center mx-auto w-full mt-5 xl:mt-20">
      {/* On screens md and above, all icons in one row */}
      {/* On screens below md, first two icons in one row */}
      <div className="flex justify-center items-center gap-5 sm:gap-[50px] md:gap-[100px] w-full">
        {icons.map((icon, index) => (
          <div key={index} className={`flex flex-col items-center gap-5`}>
            <img
              src={icon.svgPath}
              alt={icon.title}
              className="w-[50px] md:w-[89px] aspect-square"
            />
            <span className="font-medium md:font-semibold text-[19px] md:text-[24px]">
              {icon.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
