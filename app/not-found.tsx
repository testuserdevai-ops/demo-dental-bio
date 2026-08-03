import Link from "next/link";
import Navbar from "./components/Navbar";

// Flip effect for text

export default function Hero({ heroData }: any) {
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center h-full w-full overflow-x-clip">
        <div className="hero-section text-center mt-32 md:mt-48">
          {/* This div wraps the text elements */}
          <div className="max-w-screen-xl px-5 lg:px-32 mx-auto">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-snug bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-transparent">
              404
            </h1>

            <div className=" mx-auto mt-16 flex items-center justify-center"></div>
            <h2 className="md:text-xl px-7 md:px-0 font-semibold text-dark mt-8">
              page not found
            </h2>
          </div>
          <Link
            href={"/"}
            className="md:text-xl underline px-7 md:px-0 text-dark mt-10"
          >
            back to homepage
          </Link>

          {/* The HeroImages component is still here, working fine */}
        </div>
      </div>
    </>
  );
}
