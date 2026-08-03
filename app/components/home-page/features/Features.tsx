import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });
import Icons from "./Icons";

export default function Features({ featuresData }: any) {
  return (
    <>
      <div id="features"></div>
      <div className="max-w-screen-2xl px-3 lg:px-28 mt-12 lg:mt-28 text-center mx-auto">
        {/* Display the featuresData title */}
        <h2 className="text-lg md:text-2xl lg:text-[23px] md:text-[26px] font-semibold mb-5 md:mb-8">
          {featuresData.section_title}
        </h2>

        {/* Check if section_text_items exists and is an array */}
        {Array.isArray(featuresData.section_text_items) && (
          <p
            className={`${manrope.className} flex flex-wrap justify-center md:gap-4 pb-10 bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent`}
          >
            {featuresData.section_text_items.map(
              (item: any) =>
                item.section_text_item && ( // Handle possible null values
                  <span
                    key={item.id}
                    className="text-[26px] md:text-4xl lg:text-5xl font-semibold leading-tight md:leading-snug px-2.5 md:px-2"
                  >
                    {item.section_text_item}
                  </span>
                ),
            )}
          </p>
        )}

        <Icons />
      </div>
    </>
  );
}
