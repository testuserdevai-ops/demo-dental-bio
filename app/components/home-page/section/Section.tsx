import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

export default function Section({ section }: any) {
  return (
    <div className="max-w-screen-2xl px-3 lg:px-20 mt-12 lg:mt-40 z-0 bg-transparent text-center mx-auto">
      {/* Display the section title */}
      <h2 className="text-lg md:text-2xl lg:text-[23px] md:text-[26px] font-semibold mb-5 md:mb-8">
        {section.section_title}
      </h2>

      {/* Check if section_text_items exists and is an array */}
      {Array.isArray(section.section_text_items) && (
        <p
          className={`${manrope.className} flex flex-wrap justify-center md:gap-4 pb-10 bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent`}
        >
          {section.section_text_items.map(
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
    </div>
  );
}
