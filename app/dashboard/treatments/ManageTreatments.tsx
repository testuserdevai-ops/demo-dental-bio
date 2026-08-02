"use client";
import React, { useState, useEffect, useCallback, useReducer } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createClient } from "@/utils/supabase/client";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react";
import Modal from "./Modal"; // Modal component for popup
import SaveButton from "../components/SaveButton";
import SkeletonLoader from "@/app/components/Loader/SkeletonLoader";
import { treatmentSchema, zodFieldErrors } from "@/lib/validation";
import LimitedTextArea from "@/app/dashboard/components/LimitedTextArea";
import {
  EMPTY_TREATMENT_DESCRIPTION,
  TREATMENT_DESCRIPTION_MAX_LENGTH,
  treatmentDescriptionReducer,
} from "@/lib/treatmentDescription";
import { apiClient } from "@/services/apiClient";


// Constants for Drag-and-Drop
const ItemType = {
  TREATMENT: "treatment",
};

// Fetch treatments for the Dentistry
async function fetchTreatments(dentistryId: string) {
  const supabase = createClient();
  const { data: treatments, error } = await supabase
    .from("dentistry_treatments")
    .select("treatment_id, rank, treatments(title, description)")
    .eq("dentistry_id", dentistryId)
    .eq("treatments.isService", false)
    .order("rank", { nullsFirst: true });

  if (error) {
    console.error(error);
    return [];
  }

  return treatments.filter(entry => entry.treatments !== null).map((entry: any, index: number) => ({
    treatment_id: entry.treatment_id,
    title: entry.treatments.title,
    description: entry.treatments.description,
    rank: entry.rank !== null ? entry.rank : index + 1, // Assign default rank if null
  }));
}

// Update treatment order in the database
async function updateTreatmentOrder(dentistryId: string, treatments: any[]) {
  const supabase = createClient();
  for (let i = 0; i < treatments.length; i++) {
    await supabase
      .from("dentistry_treatments")
      .update({ rank: i + 1 })
      .eq("treatment_id", treatments[i].treatment_id)
      .eq("dentistry_id", dentistryId);
  }
}

// Compare two arrays to check if their order is different
const areArraysEqual = (arr1: any[], arr2: any[]) =>
  JSON.stringify(arr1.map((t) => t.treatment_id)) ===
  JSON.stringify(arr2.map((t) => t.treatment_id));

// Drag-and-Drop Treatment Component
const Treatment = ({
  treatment,
  index,
  moveTreatment,
  onEdit,
  onDelete,
}: any) => {
  const [, ref] = useDrag({
    type: ItemType.TREATMENT,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemType.TREATMENT,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveTreatment(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => {
        if (node) ref(node);
        drop(node);
      }}
      className="membar-cards p-4"
    >
      <div className="flex items-center gap-3">
        {/* Up/Down Arrows */}
        <div className="flex flex-col gap-0 hover:bg-purple-100 hover:text-deep-purple rounded-md cursor-move p-1">
          <CaretUp className="-mb-0.5" weight="bold" />
          <CaretDown className="-mt-0.5" weight="bold" />
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between gap-2 mb-1 member-cards-actions">
            <div className="max-w-[500px]">
              {/* Title & Edit Button */}
              <button
                onClick={() => onEdit(treatment)}
                className="flex items-center gap-2 member-heading"
              >
                <p className="mb-0 font-semibold text-blue-600 break-words break-all">{treatment.title}</p>
                <PencilSimple className="w-5 h-5" />
              </button>

              {/* Description with word-break fix */}
              <p className="mb-0 max-w-[500px] break-words break-all">
                {treatment.description}
              </p>
            </div>

            {/* Delete Button */}
            <div className="flex gap-3 justify-end items-center">
              <button
                className="w-10 h-10 p-0.5 hover:bg-red-100 hover:text-red-700 flex items-center justify-center rounded-md transition-all"
                onClick={() => onDelete(treatment)}
              >
                <Trash className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TreatmentItem {
  treatment_id: string;
  title: string;
  description: string;
  rank: number;
}

interface ManageTreatmentsProps {
  dentistryId: string;
  newTreatment?: TreatmentItem | null;
  onTreatmentAdded?: () => void;
}

// Main Treatments Management Component with Popup Modal for Editing
export default function ManageTreatments({
  dentistryId,
  newTreatment,
  onTreatmentAdded,
}: ManageTreatmentsProps) {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [initialTreatments, setInitialTreatments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [newTreatmentTitle, setNewTreatmentTitle] = useState("");
  const [descriptionState, dispatchDescription] = useReducer(
    treatmentDescriptionReducer,
    EMPTY_TREATMENT_DESCRIPTION,
  );
  const newTreatmentDescription = descriptionState.value;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasRearranged, setHasRearranged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch treatments on load
  const loadTreatments = async () => {
    setIsLoading(true);
    const fetchedTreatments = await fetchTreatments(dentistryId);
    setTreatments(fetchedTreatments);
    setInitialTreatments(fetchedTreatments); // Store the initial order
    setIsLoading(false);
  };

  useEffect(() => {
    loadTreatments();
  }, [dentistryId]);

  // Add new treatment to the list when provided
  useEffect(() => {
    if (newTreatment) {
      setTreatments(prev => [...prev, newTreatment]);
      setInitialTreatments(prev => [...prev, newTreatment]);
      if (onTreatmentAdded) {
        onTreatmentAdded();
      }
    }
  }, [newTreatment, onTreatmentAdded]);

  // Move treatment in the list
  const moveTreatment = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedTreatments = [...treatments];
      const [movedTreatment] = updatedTreatments.splice(fromIndex, 1);
      updatedTreatments.splice(toIndex, 0, movedTreatment);
      setTreatments(updatedTreatments);

      // Check if the new order is different from the initial order
      if (!areArraysEqual(updatedTreatments, initialTreatments)) {
        setHasRearranged(true);
      } else {
        setHasRearranged(false);
      }
    },
    [treatments, initialTreatments]
  );

  // Handle editing a treatment
  const handleEditTreatment = (treatment: any) => {
    setEditingTreatment(treatment);
    setNewTreatmentTitle(treatment.title);
    dispatchDescription({ type: "editStarted", value: treatment.description });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleUpdateTreatment = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = treatmentSchema.safeParse({ title: newTreatmentTitle, description: newTreatmentDescription });
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      return;
    }

    try {
      await apiClient.put("/api/treatments", {
        dentistryId,
        treatmentId: editingTreatment.treatment_id,
        title: newTreatmentTitle,
        description: newTreatmentDescription,
      });
    } catch (error) {
      dispatchDescription({ type: "submissionFailed" });
      setErrors((previous) => ({
        ...previous,
        form: error instanceof Error ? error.message : "Unable to update treatment",
      }));
      return;
    }

    const updatedTreatments = treatments.map((t) =>
      t.treatment_id === editingTreatment.treatment_id
        ? {
          ...t,
          title: newTreatmentTitle,
          description: newTreatmentDescription,
        }
        : t
    );

    setTreatments(updatedTreatments);
    setEditingTreatment(null);
    setNewTreatmentTitle("");
    dispatchDescription({ type: "submissionSucceeded" });
    setErrors({});
    setIsModalOpen(false);

    // Reload treatments after update
    loadTreatments();
  };

  // Handle deleting a treatment
  const handleDeleteTreatment = async (treatment: any) => {
    const supabase = createClient();
    await supabase
      .from("dentistry_treatments")
      .delete()
      .eq("treatment_id", treatment.treatment_id)
      .eq("dentistry_id", dentistryId);
    await supabase
      .from("treatments")
      .delete()
      .eq("treatment_id", treatment.treatment_id);

    // Reload treatments after delete
    loadTreatments();
    const event = new Event("iframeRefresh");
    window.dispatchEvent(event);
  };

  // Handle saving the new order of treatments
  const handleSaveOrder = async () => {
    await updateTreatmentOrder(dentistryId, treatments);

    // Reload treatments after saving the order
    loadTreatments();
    setHasRearranged(false); // Reset the rearranged state
    const event = new Event("iframeRefresh");
    window.dispatchEvent(event);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {treatments.length > 0 && ( // Conditionally render the title only if treatments exist
        <h2 className="text-lg font-semibold mb-3">Arrange Treatments</h2>
      )}
      {isLoading ? (
        <div>
          {/* Skeleton loader components for the loading state */}
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </div>
      ) : (
        <div>
          {treatments.map((treatment, index) => (
            <Treatment
              key={treatment.treatment_id}
              index={index}
              treatment={treatment}
              moveTreatment={moveTreatment}
              onEdit={handleEditTreatment}
              onDelete={handleDeleteTreatment}
            />
          ))}
        </div>
      )}
      <div className="w-full flex justify-end mt-4 mb-4">
        {hasRearranged && (
          <button
            className={`bg-primary-1 hover:bg-deep-purple transition-all text-white p-2 rounded-[26px] py-2 text-lg px-3 font-semibold flex items-center gap-2`}
            onClick={handleSaveOrder}
          >
            Save treatment order
          </button>
        )}
      </div>

      {/* Modal Popup for Editing Treatment */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleUpdateTreatment}>
            <h2 className="text-lg font-semibold mb-3">Edit treatment</h2>
            <div className="mb-3">
              <input
                type="text"
                value={newTreatmentTitle}
                onChange={(e) => { setNewTreatmentTitle(e.target.value); (errors.title || errors.form) && setErrors((prev) => ({ ...prev, title: "", form: "" })); }}
                placeholder="Treatment Title"
                className={`w-full p-2 rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal ${errors.title ? 'ring-1 ring-red-500' : ''}`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1 pl-4">{errors.title}</p>}
            </div>
            <div className="mb-3">
              <LimitedTextArea
                name="edit-treatment-description"
                value={newTreatmentDescription}
                onChange={(e) => { dispatchDescription({ type: "change", value: e.target.value }); (errors.description || errors.form) && setErrors((prev) => ({ ...prev, description: "", form: "" })); }}
                placeholder="Treatment Description"
                limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
                allowOverLimit
                error={errors.description}
              />
            </div>
            {errors.form && <p className="text-red-500 text-sm mb-3" role="alert">{errors.form}</p>}
            <div className="w-full flex justify-end">
              <SaveButton text={"Update treatment"} />
            </div>
          </form>
        </Modal>
      )}
    </DndProvider>
  );
}
