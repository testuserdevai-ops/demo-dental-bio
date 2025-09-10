import "@fortawesome/fontawesome-free/css/all.min.css";
import "./link-page-responsive.css";
import "./link-page.css";

import { redirect } from "next/navigation";

import Header from "./components/Header";
import ProfileDetail from "./components/ProfileDetail";
import Treatments from "./components/Treatments";
import WorkLocation from "./components/WorkLocation";
import Footer from "./components/Footer";
import supabase from "../lib/supabaseClient";
import Links from "./components/Links";
import Image from "next/image";
import Link from "next/link";
import { unstable_noStore } from "next/cache"; // Import noStore to prevent caching
import Gallery from "./components/Gallery";
import Services from "./components/Services";
import Reviews from "./components/Reviews";
import BlogGroupList from "./components/BlogGroupList";
import VideoGroupList from "./components/VideoGroupList";

type PageProps = {
  params: { username: string };
};

export default async function HomePage({ params }: PageProps) {
  const username = params.username;

  unstable_noStore();

  // Fetch the user from Supabase based on the username slug
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, position, first_name, last_name, title, gdc_no, qualification, isVerified, use_dental_brand, subscription_status, email")
    .ilike("username", username)
    .single();

  // Handle error or no user case
  if (!user || userError) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen gap-10 text-center mx-auto px-10`}>
        <span className="bg-gradient-to-r from-[#8866e9] via-[#cb7470] to-[#ed8b39] bg-clip-text text-transparent">
          <span className="flex items-center mb-4 justify-center flex-col text-6xl md:text-8xl font-bold">
            dental.bio/<span className="font-bold">{username}</span>
          </span>
          <span className="text-[23px] md:text-[26px] font-semibold max-w-screen-md w-full mx-auto bg-clip-text text-transparent">
            is available!
          </span>
        </span>

        <Link
          href={"/"}
          className="w-full text-2xl whitespace-nowrap mx-auto py-2 font-semibold bg-gradient-to-r from-[#d47e8b] via-[#d47e8b] to-[#e09f7e] text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent max-w-80 no-underline px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
        >
          Claim
        </Link>

        <p className="text-md font-bold text-2xl md:text-3xl leading-normal md:leading-normal md:mt-[50px] max-w-screen-md w-full text-center text-[#8866e9]">
          Grab it before its taken!
        </p>

        <Link href={"/"}>
          <Image
            src={"/logo.svg"}
            width={200}
            height={25}
            alt="Dental.bio navigation bar logo"
            className="px-4 py-3 pt-5"
          />
        </Link>
      </div>
    );
  }

  // Fetch the dentistry data using the user's ID
  let { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Handle error or no dentistry case
  // if (!dentistry || dentistryError) {
  //   const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();

  //   // Prepare the new dentistry data
  //   const newDentistry = {
  //     user_id: user.id,
  //     about_title: fullName || "", // Set to first_name + last_name
  //     about_text: "",
  //     phone: "",
  //     booking_link: "",
  //     contact_email: user.email || "", // Set to user's email
  //   };

  //   const { data: insertedDentistry, error: insertError } = await supabase
  //     .from("dentistries")
  //     .insert([newDentistry])
  //     .select("*")
  //     .single();

  //   if (insertError) {
  //     return redirect("/error?message=failed_to_create_dentistry");
  //   }

  //   dentistry = insertedDentistry
  // }

  return (
    <>
      <div className="wrapper">
        <div className="profile-wrapper flex flex-col gap-8">
          <Header
            username={username}
            dentistry_id={dentistry.dentistry_id}
            contact_email={dentistry.contact_email}
            isVerified={user.isVerified}
            useDentalBrand={user.use_dental_brand}
          />

          {dentistry.about_title && (
            <ProfileDetail
              userId={user.id}
              username={username}
              position={user.position}
              gdc_no={user.gdc_no}
              qualification={user.qualification}
              title={dentistry.about_title}
              description={dentistry.about_text}
              dentistry_id={dentistry.dentistry_id}
              website_link={dentistry.website}
              isVerified={user.isVerified}
              isFreePlan={["PRO", "PREMIUM PRO"].includes(user.subscription_status) === false}
            />
          )}
          <Treatments dentistryId={dentistry.dentistry_id} />
          <Services dentistryId={dentistry.dentistry_id} />
          <Links dentistryId={dentistry.dentistry_id} />
          <BlogGroupList
            userId={user.id}
            username={username}
          />
          <VideoGroupList
            userId={user.id}
          />
          <Gallery
            userId={user.id}
          />
          <Reviews
            userId={user.id}
          />
          <WorkLocation dentistry={dentistry} />
          <Footer
            dentistryId={dentistry.dentistry_id}
            bookingLink={dentistry.booking_link}
            contact_email={dentistry.contact_email}
            username={username}
            title={dentistry.about_title}
            useDentalBrand={user.use_dental_brand}
            website_link={dentistry.website}
          />
        </div>
      </div>
    </>
  );
}
