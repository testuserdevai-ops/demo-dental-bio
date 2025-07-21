"use client";
import { useEffect, useState } from "react";
import GalleryImage from "./GalleryImage";
import { useNavbar } from "@/app/contexts/NavbarContext";

export default function Gallery({ userId }: { userId: string }) {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [generalGalleries, setGeneralGalleries] = useState<any[]>([]);
  const { setNavItemState } = useNavbar();

  // Fetch dental galleries
  useEffect(() => {
    const fetchGalleries = async () => {
      const query = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/galleries${query}`, {
        method: 'GET'
      });
      const data = await response.json();
      setGalleries(data);

      if (data.length > 0) {
        setNavItemState("Gallery", true);
      }
    };

    fetchGalleries();
  }, [userId]);

  // Fetch general galleries
  useEffect(() => {
    const fetchGeneralGalleries = async () => {
      const query = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/general-galleries${query}`, {
        method: 'GET'
      });
      const data = await response.json();
      setGeneralGalleries(data);
    };
    fetchGeneralGalleries();
  }, [userId]);

  return (
    <div className="text-center treatment-wrapper" id="gallery">
      {/* Dental Gallery Section */}
      {galleries.length > 0 &&
        <>
          <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-8">Dental Gallery</h1>
          <div
            className="accordion custom-accoradion-wrapper"
            id="accordionExample"
          >
            {galleries.map((gallery) => (
              <div key={gallery.id} className="grid grid-cols-2 gap-6 px-6">
                <GalleryImage
                  className="w-full"
                  src={gallery.before_image_url}
                  title={gallery.title}
                  subTitle={gallery.before_image_label}
                />
                <GalleryImage
                  className="w-full"
                  src={gallery.after_image_url}
                  title={gallery.title}
                  subTitle={gallery.after_image_label}
                />
              </div>
            ))}
          </div>
        </>}
      {/* General Gallery Section */}
      {generalGalleries.length > 0 &&
        <>
          <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-8 mt-12">General Gallery</h1>
          <div className="grid grid-cols-2 gap-6 px-6">
            {generalGalleries.map((gallery) => (
              <div key={gallery.id} className="w-full mb-4">
                <GalleryImage
                  className="w-full"
                  src={gallery.image_url}
                  title={gallery.title}
                  subTitle={""}
                />
              </div>
            ))}
          </div>
        </>}
    </div>
  );
}
