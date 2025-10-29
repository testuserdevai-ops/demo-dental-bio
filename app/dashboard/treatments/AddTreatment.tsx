"use client";
import React, { useState, useEffect } from "react";
import SaveButton from "../components/SaveButton";
import { createClient } from "@/utils/supabase/client";
import LabeledInput from "../components/LabeledInput";
import TooltipSwitcher from "@/app/components/TooltipSwitcher"; // Import TooltipSwitcher
import LimitedTextArea from "@/app/dashboard/components/LimitedTextArea";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { usePreview } from "@/app/contexts/PreviewContext";

// Function for Captical First
function toCapitalFirst(sentence: string): string {
  return sentence.toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

interface TreatmentItem {
  treatment_id: string;
  title: string;
  description: string;
  rank: number;
}

interface AddTreatmentFormProps {
  dentistryId: string;
  onNewTreatment?: (treatment: TreatmentItem) => void;
  onNewService?: (service: TreatmentItem) => void;
}

// Client-side component to add a treatment
export default function AddTreatmentForm({ dentistryId, onNewTreatment, onNewService }: AddTreatmentFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isService, setIsService] = useState(false); // Use useState instead of useReducer
  const [isLoading, setIsLoading] = useState(false);

  const maxLimit = 200;
  const { triggerReload } = usePreview();

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
    setIsLoading(true);
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
      setIsLoading(false);
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
      setIsLoading(false);
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
      setIsLoading(false);
      return;
    }

    // Create the new item data
    const newItem: TreatmentItem = {
      treatment_id: treatmentData.treatment_id,
      title: toCapitalFirst(title),
      description,
      rank: nextRank
    };

    // Call the appropriate callback based on whether it's a service or treatment
    if (isService && onNewService) {
      onNewService(newItem);
    } else if (!isService && onNewTreatment) {
      onNewTreatment(newItem);
    }

    // Call triggerReload to update the preview and lists
    triggerReload();
    // Reset form fields
    setTitle("");
    setDescription("");
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6 mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pb-2 sm:pb-0">
        <h2 className="text-lg font-semibold">Add new {isService ? "service" : "treatment"}</h2>
        <TooltipSwitcher
          id="treatment-service-switcher"
          isChecked={isService}
          onToggle={toggleIsService}
          labelLeft="Treatment"
          labelRight="Service"
          tooltipText="Toggle between adding a treatment or a service" // Tooltip text
        />
      </div>
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

      <LimitedTextArea
        placeholder={`${isService ? "Service" : "Treatment"} Description`}
        name="description"
        value={description}
        onChange={handleTextChange}
        limit={200}
        required
      />
      <div className="w-full flex justify-end">
        <FullRoundedButton type="submit" disabled={isLoading} isLoading={isLoading}>
          Add {isService ? "service" : "treatment"}
        </FullRoundedButton>
      </div>
    </form>
  );
}
