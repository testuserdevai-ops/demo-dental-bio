"use client";
import { useState } from "react";
import Collapse from "./Collapse";

export default function Services({
  serverTreatments,
  sectionTitle,
}: {
  serverTreatments: any[];
  sectionTitle: string;
}) {
  const [openItem, setOpenItem] = useState<number | null>(null); // Track the accordion item

  // Toggle the accordion item
  const toggleItem = (index: number) => {
    setOpenItem((prevIndex) => (prevIndex === index ? null : index));
  };

  const services = serverTreatments.filter(
    (treatment) => treatment.treatments.isService === true,
  );

  // Render treatments
  return (
    <>
      {services.length > 0 ? (
        <section id="services">
          <div className="text-center">
            <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-4">
              {sectionTitle}
            </h1>
            <div
              className="accordion custom-accoradion-wrapper flex flex-col gap-2"
              id="accordionExample"
            >
              {services.map((treatment, index) => (
                <Collapse
                  title={treatment.treatments.title || "Untitled treatment"}
                  key={treatment.treatment_id}
                  isOpen={openItem === index}
                  onToggle={() => toggleItem(index)}
                  analytics={{
                    action: {
                      type: "service_expand",
                      treatmentId: treatment.treatment_id,
                    },
                    section: "services",
                    position: index + 1,
                  }}
                >
                  <span className="break-words [overflow-wrap:anywhere]">
                    {treatment.treatments.description ||
                      "No description available."}
                  </span>
                </Collapse>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <></>
      )}
    </>
  );
}
