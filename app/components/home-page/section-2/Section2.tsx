import Image from "next/image";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

export default function Section2({ sectionTwoData }: any) {
  return (
    <div className="max-w-screen-2xl w-full mt-10 md:mt-14 gap-6 md:gap-14 mx-auto flex flex-col md:flex-row items-center  text-center md:text-start justify-between">
      <div className="flex flex-col items-center md:items-start px-14 md:px-12 lg:px-14 xl:px-32 ">
        <h2
          className={`${manrope.className} text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-[45px] font-semibold leading-tight xl:leading-tight mb-6 text-primary-3`}
        >
         <p dangerouslySetInnerHTML={{ __html: sectionTwoData.title.replace(/®/g, '®<br>') }} />

        </h2>
        <p className=" text-lg md:text-xl px-4 md:px-0 text-dark font-medium -mt-5 md:-mt-3 lg:whitespace-nowrap">
          {sectionTwoData.description}
        </p>
      </div>
      <div className="flex flex-col items-center md:items-end px-3 xl:pr-28">
        <Image
          src={"/section-2-1.webp"}
          width={550}
          height={550}
          alt=""
          className="rounded-3xl w-[550px]"
        />
        <Image
          src={"/section-2-2.webp"}
          width={550}
          height={550}
          alt=""
          className="rounded-3xl w-[550px]"
        />
      </div>
    </div>
  );
}
