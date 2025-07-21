"use client";
import React, { useState, useEffect } from "react";
import SaveButton from "../components/SaveButton";
import { createClient } from "@/utils/supabase/client";
import LabeledInput from "../components/LabeledInput";
import TooltipSwitcher from "@/app/components/TooltipSwitcher"; // Import TooltipSwitcher
import LimitedTextArea from "@/app/dashboard/components/LimitedTextArea";

// Function for Captical First
function toCapitalFirst(sentence: string): string {
  return sentence.toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

// Client-side component to add a treatment
export default function AddTreatmentForm({ dentistryId }: { dentistryId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isService, setIsService] = useState(false); // Use useState instead of useReducer

  const maxLimit = 200;

  // Load the initial value of isService from localStorage on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedIsService = localStorage.getItem("isService");
      if (savedIsService !== null) {
        setIsService(JSON.parse(savedIsService));
      }
    }
  }, []);

  // Function to toggle isService and save to localStorage
  const toggleIsService = () => {
    const newState = !isService;
    setIsService(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("isService", JSON.stringify(newState));
    }
  };

  // Function to limit text area
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLimit) {
      setDescription(e.target.value);
    }
  };

  // Function to handle the form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = createClient();

    // Insert new treatment
    const { data: treatmentData, error: treatmentError } = await supabase
      .from("treatments")
      .insert([{
        title: toCapitalFirst(title),
        description,
        isService
      }])
      .select("treatment_id")
      .single();

    if (treatmentError) {
      console.error("Error adding treatment:", treatmentError);
      return;
    }

    // Get the max rank for the treatments associated with the dentistry
    const { data: maxRankData, error: rankError } = await supabase
      .from("dentistry_treatments")
      .select("rank")
      .eq("dentistry_id", dentistryId)
      .order("rank", { ascending: false })
      .limit(1)
      .single();

    let nextRank = 1; // Default to 1 if no treatments exist

    if (maxRankData) {
      nextRank = maxRankData.rank + 1; // Increment rank if there is data
    } else if (rankError && rankError.code !== "PGRST116") {
      // Only log if the error is something other than no rows found (PGRST116)
      console.error("Error fetching max rank:", rankError);
      return;
    }

    // Link the new treatment to the dentistry
    const { error: linkError } = await supabase
      .from("dentistry_treatments")
      .insert([
        { dentistry_id: dentistryId, treatment_id: treatmentData.treatment_id, rank: nextRank },
      ]);

    if (linkError) {
      console.error("Error linking treatment:", linkError);
      return;
    }

    // Ensure page refresh after successful submission
    try {
      window.location.reload(); // Hard refresh fallback
    } catch (error) {
      console.error("Soft refresh failed, performing hard reload:", error);
      window.location.reload(); // Hard refresh fallback
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 mt-10">
      <div className="flex flex-col sm:flex-row sm:justify-between pb-2 sm:pb-0">
        <h2 className="text-lg font-semibold mb-3">Add new {isService ? "service" : "treatment"}</h2>
        <TooltipSwitcher
          isChecked={isService}
          onToggle={toggleIsService}
          labelLeft="Treatment"
          labelRight="Service"
          tooltipText="Toggle between adding a treatment or a service" // Tooltip text
        />
      </div>
      <div className="mb-3">
        <LabeledInput
          id='title'
          label={`${isService ? "Service" : "Treatment"} Title`}
          name="title"
          className="w-ful text-base"
          // placeholder="Treatment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <LimitedTextArea
        placeholder={`${isService ? "Service" : "Treatment"} Description`}
        name="description"
        value={description}
        onChange={handleTextChange}
        limit={200}
        required
      />
      <div className="w-full flex justify-end">
        <SaveButton text={`Add ${isService ? "service" : "treatment"}`} />
      </div>
    </form>
  );
}
