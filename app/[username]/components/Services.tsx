"use client";
import { useEffect, useState } from "react";
import { Plus, Minus } from "@phosphor-icons/react"; // Import Phosphor Icons
import { createClient } from "@/utils/supabase/client";
import Collapse from "./Collapse";

export default function Services({ dentistryId }: { dentistryId: string }) {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Handle loading state
  const [openItem, setOpenItem] = useState<number | null>(null); // Track the accordion item

  // Fetch treatments from Supabase
  useEffect(() => {
    async function fetchTreatments() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dentistry_treatments")
        .select("treatment_id, rank, treatments(title, description)")
        .eq("dentistry_id", dentistryId)
        .eq("treatments.isService", true)
        .order("rank");

      if (error) {
        console.error("Error fetching treatments:", error);
        setLoading(false);
        return;
      }

      // Update the treatments state
      setTreatments(
        data.filter(item => item.treatments !== null).map((entry: any) => ({
          treatment_id: entry.treatment_id,
          title: entry.treatments.title,
          description: entry.treatments.description,
          rank: entry.rank,
        }))
      );

      setLoading(false);
    }

    fetchTreatments();
  }, [dentistryId]);

  // Toggle the accordion item
  const toggleItem = (index: number) => {
    setOpenItem((prevIndex) => (prevIndex === index ? null : index));
  };

  // Show loading message while fetching data
  if (loading) {
    return <h2 className="section-heading-treatment">Loading services...</h2>;
  }


  // Render treatments
  return (
    <>
      {treatments.length > 0 ?
        <section>
          <div className="text-center">
            <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-4">Services</h1>
            <div
              className="accordion custom-accoradion-wrapper flex flex-col gap-2"
              id="accordionExample"
            >
              {treatments.map((treatment, index) => (
                <Collapse
                  title={treatment.title || "Untitled treatment"}
                  key={index}
                  isOpen={openItem === index}
                  onToggle={() => toggleItem(index)}
                >
                  <span>{treatment.description || "No description available."}</span>
                </Collapse>
              ))}
            </div>
          </div>
        </section> : <></>}
    </>
  );
}
