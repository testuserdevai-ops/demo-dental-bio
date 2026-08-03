"use client";
import { useEffect, useState } from "react";
import {
  PlusCircle,
  FileText,
  XCircle,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";

type offer = {
  id: number;
  university: string;
  offer_code: string;
};

const OfferCodeManagement: React.FC = () => {
  const [newOffer, setNewOffer] = useState({ university: "", offer_code: "" });
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const [isAddingLoading, setIsAddingLoading] = useState<boolean>(false);
  const [isSavingLoading, setIsSavingLoading] = useState<boolean>(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingInputValue, setEditingInputValue] = useState({
    university: "",
    offer_code: "",
  });

  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null);

  const [data, setData] = useState<offer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const getOfferCodes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/offer-code", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const fetchData = await response.json();
          setData(fetchData);
        }
      } catch (error) {
        console.log(error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    getOfferCodes();
  }, []);

  const handleSaveNewOfferCode = async () => {
    try {
      setIsAddingLoading(true);
      const response = await fetch("/api/offer-code", {
        method: "POST", // Assuming POST is used to create new entries
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOffer),
      });

      if (response.ok) {
        setIsAdding(false);
        data.push({ ...newOffer, id: data.length });
        setNewOffer({ university: "", offer_code: "" });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsAddingLoading(false);
    }
  };

  const handleEditSave = async (index: number, id: number) => {
    try {
      setIsSavingLoading(true);
      const response = await fetch("/api/offer-code", {
        method: "PUT", // Assuming POST is used to create new entries
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, value: editingInputValue }),
      });

      if (response.ok) {
        const updatedData = [...data];
        updatedData[index] = { ...editingInputValue, id };
        setData(updatedData);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSavingLoading(false);
      setEditingIndex(null);
    }
  };

  const handleDelete = async (index: number, id: number) => {
    try {
      setIsDeletingIndex(index);
      const response = await fetch("/api/offer-code", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        const newData = [...data];
        newData.splice(index, 1);
        setData(newData);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsDeletingIndex(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Offer Code Management</h1>
        <FullRoundedButton
          onClick={() => setIsAdding(true)}
          className="shadow-md"
        >
          <PlusCircle size={20} className="mr-1" />
          Add Offer Code
        </FullRoundedButton>
      </div>

      <div className="overflow-x-auto rounded-[26px] border border-gray-200 shadow-xl pb-1">
        <table className="w-full">
          <thead className="bg-primary-1 text-white">
            <tr>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                #
              </th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                University
              </th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                Offer code
              </th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 4 }).map((_, cellIndex) => (
                    <td
                      key={`skeleton-cell-${cellIndex}`}
                      className="px-4 py-3"
                    >
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-xl font-semibold">No offer code found</p>
                    <p className="text-sm mt-1">Please add the offer codes!</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((offer, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">
                    {editingIndex === index ? (
                      <LabeledInput
                        label="University"
                        name="university"
                        type="text"
                        value={editingInputValue.university}
                        onChange={(e) =>
                          setEditingInputValue({
                            ...editingInputValue,
                            university: e.target.value,
                          })
                        }
                      />
                    ) : (
                      offer.university
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingIndex === index ? (
                      <LabeledInput
                        label="OfferCode"
                        name="offer_code"
                        type="text"
                        value={editingInputValue.offer_code}
                        onChange={(e) =>
                          setEditingInputValue({
                            ...editingInputValue,
                            offer_code: e.target.value,
                          })
                        }
                      />
                    ) : (
                      offer.offer_code
                    )}
                  </td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    {editingIndex === index ? (
                      <>
                        <FullRoundedButton
                          onClick={() => handleEditSave(index, offer.id)}
                          className="mr-2"
                          isLoading={isSavingLoading}
                        >
                          <FileText size={20} />
                        </FullRoundedButton>
                        <FullRoundedButton
                          onClick={() => setEditingIndex(null)}
                          className="mr-2"
                          buttonType="danger"
                        >
                          <XCircle size={20} />
                        </FullRoundedButton>
                      </>
                    ) : (
                      <>
                        <FullRoundedButton
                          onClick={() => {
                            (setEditingIndex(index),
                              setEditingInputValue(offer));
                          }}
                          className="mr-2"
                        >
                          <PencilSimple size={20} />
                        </FullRoundedButton>
                        <FullRoundedButton
                          onClick={() => handleDelete(index, offer.id)}
                          className="mr-2"
                          buttonType="danger"
                          isLoading={isDeletingIndex === index ? true : false}
                        >
                          <Trash size={20} />
                        </FullRoundedButton>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
            {isAdding && (
              <tr>
                <td className="px-4 py-3">{data.length + 1}</td>
                <td className="px-4 py-3">
                  <LabeledInput
                    label="University"
                    name="university"
                    type="text"
                    value={newOffer.university}
                    onChange={(e) =>
                      setNewOffer({ ...newOffer, university: e.target.value })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <LabeledInput
                    label="OfferCode"
                    name="offer_code"
                    type="text"
                    value={newOffer.offer_code}
                    onChange={(e) =>
                      setNewOffer({ ...newOffer, offer_code: e.target.value })
                    }
                  />
                </td>
                <td className="px-4 py-3 flex justify-center gap-2">
                  <FullRoundedButton
                    onClick={handleSaveNewOfferCode}
                    className="mr-2"
                    isLoading={isAddingLoading}
                  >
                    <FileText size={20} />
                  </FullRoundedButton>
                  <FullRoundedButton
                    onClick={() => setIsAdding(false)}
                    className="mr-2"
                    buttonType="danger"
                  >
                    <XCircle size={20} />
                  </FullRoundedButton>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfferCodeManagement;
