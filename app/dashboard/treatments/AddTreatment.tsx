"use client";
import React, { useReducer, useState, useEffect } from "react";
import LabeledInput from "../components/LabeledInput";
import TooltipSwitcher from "@/app/components/TooltipSwitcher"; // Import TooltipSwitcher
import LimitedTextArea from "@/app/dashboard/components/LimitedTextArea";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { usePreview } from "@/app/contexts/PreviewContext";
import { treatmentSchema, zodFieldErrors } from "@/lib/validation";
import {
  EMPTY_TREATMENT_DESCRIPTION,
  TREATMENT_DESCRIPTION_MAX_LENGTH,
  treatmentDescriptionReducer,
} from "@/lib/treatmentDescription";
import { apiClient } from "@/services/apiClient";


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
  const [descriptionState, dispatchDescription] = useReducer(
    treatmentDescriptionReducer,
    EMPTY_TREATMENT_DESCRIPTION,
  );
  const description = descriptionState.value;
  const [isService, setIsService] = useState(false); // Use useState instead of useReducer
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatchDescription({ type: "change", value: e.target.value });
  };

  // Function to handle the form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = treatmentSchema.safeParse({ title, description });
    if (!result.success) {
      const fieldErrors = zodFieldErrors(result.error);
      const label = isService ? "Service" : "Treatment";
      if (fieldErrors.title) fieldErrors.title = fieldErrors.title.replace("Title", `${label} title`);
      if (fieldErrors.description) fieldErrors.description = fieldErrors.description.replace("Description", `${label} description`);
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    let newItem: TreatmentItem;
    try {
      newItem = await apiClient.post<TreatmentItem>("/api/treatments", {
        dentistryId,
        title: toCapitalFirst(title),
        description,
        isService,
      });
    } catch (error) {
      dispatchDescription({ type: "submissionFailed" });
      setErrors((previous) => ({
        ...previous,
        form: error instanceof Error ? error.message : "Unable to save treatment",
      }));
      setIsLoading(false);
      return;
    }

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
    dispatchDescription({ type: "submissionSucceeded" });
    setErrors({});
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col-gap mb-6 mt-10">
      <div className="flex-col-gap sm:flex-row sm:justify-between pb-2 sm:pb-0">
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
        value={title}
        onChange={(e) => { setTitle(e.target.value); (errors.title || errors.form) && setErrors((prev) => ({ ...prev, title: "", form: "" })); }}
        error={errors.title}
      />

      <LimitedTextArea
        placeholder={`${isService ? "Service" : "Treatment"} Description`}
        name="description"
        value={description}
        onChange={(e) => { handleTextChange(e); (errors.description || errors.form) && setErrors((prev) => ({ ...prev, description: "", form: "" })); }}
        limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
        allowOverLimit
        error={errors.description}
      />
      {errors.form && <p className="text-red-500 text-sm" role="alert">{errors.form}</p>}
      <div className="w-full flex justify-end">
        <FullRoundedButton type="submit" disabled={isLoading} isLoading={isLoading}>
          Add {isService ? "service" : "treatment"}
        </FullRoundedButton>
      </div>
    </form>
  );
}
