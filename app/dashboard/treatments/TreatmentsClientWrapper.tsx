"use client";
import React, { useState } from "react";
import AddTreatmentForm from "./AddTreatment";
import ManageTreatments from "./ManageTreatments";
import ManageServices from "./ManageServices";

interface TreatmentItem {
  treatment_id: string;
  title: string;
  description: string;
  rank: number;
}

interface TreatmentsClientWrapperProps {
  dentistryId: string;
}

export default function TreatmentsClientWrapper({ dentistryId }: TreatmentsClientWrapperProps) {
  const [newTreatment, setNewTreatment] = useState<TreatmentItem | null>(null);
  const [newService, setNewService] = useState<TreatmentItem | null>(null);

  const handleNewTreatment = (treatment: TreatmentItem) => {
    setNewTreatment(treatment);
  };

  const handleNewService = (service: TreatmentItem) => {
    setNewService(service);
  };

  return (
    <>
      <AddTreatmentForm 
        dentistryId={dentistryId} 
        onNewTreatment={handleNewTreatment}
        onNewService={handleNewService}
      />
      <ManageTreatments 
        dentistryId={dentistryId} 
        newTreatment={newTreatment}
        onTreatmentAdded={() => setNewTreatment(null)}
      />
      <ManageServices 
        dentistryId={dentistryId} 
        newService={newService}
        onServiceAdded={() => setNewService(null)}
      />
    </>
  );
} 