"use client";
import GalleryImage from "./GalleryImage";

export default function Gallery({
  serverGalleries,
  serverGeneralGalleries,
}: {
  serverGalleries: any[];
  serverGeneralGalleries: any[];
}) {
  return serverGalleries.length > 0 || serverGeneralGalleries.length > 0 ? (
    <div className="flex flex-col gap-7">
      {serverGalleries.length > 0 ? (
        <div className="text-center" id="gallery">
          {/* Gallery Section */}
          <h1 className="text-[23px] md:text-[26px] font-semibold pb-7">
            Gallery
          </h1>
          <div
            className="accordion custom-accoradion-wrapper"
            id="accordionExample"
          >
            {serverGalleries.map((gallery) => (
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
        </div>
      ) : (
        <></>
      )}
      {serverGeneralGalleries.length > 0 ? (
        <div className="text-center" id="gallery">
          {/* General gallery Section */}
          <h1 className="text-[23px] md:text-[26px] font-semibold pb-7">
            General gallery
          </h1>
          <div className="grid grid-cols-2 gap-6 px-6">
            {serverGeneralGalleries.map((gallery) => (
              <div key={gallery.id} className="w-full">
                <GalleryImage
                  className="w-full"
                  src={gallery.image_url}
                  title={gallery.title}
                  subTitle={""}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  ) : (
    <></>
  );
}
