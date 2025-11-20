"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Trash, CheckCircle, Plus } from "@phosphor-icons/react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

interface PaymentMethodsProps {
  customerId: string | null;
}

function PaymentMethodsList({ customerId }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showUpdateDefaultConfirm, setShowUpdateDefaultConfirm] = useState(false);
  const [paymentMethodToRemove, setPaymentMethodToRemove] = useState<string | null>(null);
  const [paymentMethodToDefault, setPaymentMethodToDefault] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (customerId) {
      fetchPaymentMethods();
    } else {
      setLoading(false);
    }
  }, [customerId]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/subscription/payment-methods");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch payment methods");
      }

      setPaymentMethods(data.paymentMethods || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDefaultClick = (paymentMethodId: string) => {
    setPaymentMethodToDefault(paymentMethodId);
    setShowUpdateDefaultConfirm(true);
  };

  const handleSetDefault = async () => {
    if (!paymentMethodToDefault) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/subscription/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethodToDefault }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set default payment method");
      }

      await fetchPaymentMethods();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorMessage(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveClick = (paymentMethodId: string) => {
    setPaymentMethodToRemove(paymentMethodId);
    setShowRemoveConfirm(true);
  };

  const handleRemove = async () => {
    if (!paymentMethodToRemove) return;

    setIsRemoving(true);
    try {
      const response = await fetch("/api/subscription/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethodToRemove }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove payment method");
      }

      await fetchPaymentMethods();
      setShowRemoveConfirm(false);
      setPaymentMethodToRemove(null);
    } catch (err: any) {
      setShowRemoveConfirm(false);
      setErrorMessage(err.message);
      setShowErrorMessage(true);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setAdding(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Create payment method
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (createError || !paymentMethod) {
        throw createError || new Error("Failed to create payment method");
      }

      // Attach to customer and set as default
      const response = await fetch("/api/subscription/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add payment method");
      }

      // Clear the form
      cardElement.clear();
      setShowAddForm(false);
      await fetchPaymentMethods();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorMessage(true);
    } finally {
      setAdding(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === "visa") return "💳";
    if (brandLower === "mastercard") return "💳";
    if (brandLower === "amex") return "💳";
    return "💳";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-1"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[26px] p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200 text-center">
        <CreditCard size={48} className="mx-auto text-neutral-400 mb-4" />
        <p className="text-neutral-600 text-sm sm:text-base mb-4">No customer account found. Please create a subscription first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods List */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-4">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-3xl sm:text-4xl flex-shrink-0">{getCardBrandIcon(pm.card.brand)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-dark capitalize break-words">
                      {pm.card.brand} •••• {pm.card.last4}
                    </span>
                    {pm.isDefault && (
                      <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full flex items-center gap-1 flex-shrink-0">
                        <CheckCircle size={14} weight="fill" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                    Expires {String(pm.card.expMonth).padStart(2, "0")}/{pm.card.expYear}
                  </p>
                </div>
              </div>
              <div className={`flex ${pm.isDefault ? "justify-end" : "justify-between"} items-center gap-2 flex-shrink-0 sm:ml-4`}>
                {!pm.isDefault && (
                  <button
                    onClick={() => handleDefaultClick(pm.id)}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-1 hover:bg-primary-5 rounded-[20px] transition-colors whitespace-nowrap"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleRemoveClick(pm.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                  title="Remove payment method"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200 text-center">
          <CreditCard size={48} className="mx-auto text-neutral-400 mb-4" />
          <p className="text-neutral-600 text-sm sm:text-base">No payment methods found.</p>
        </div>
      )}

      {/* Add Payment Method Form */}
      {showAddForm ? (
        <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200">
          <h4 className="text-base sm:text-lg font-semibold text-dark mb-4">Add Payment Method</h4>
          <form onSubmit={handleAddPaymentMethod} className="space-y-4">
            <div className="p-4 border border-neutral-300 rounded-[20px] bg-white">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#1c1c21",
                      "::placeholder": {
                        color: "#9d9d9d",
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <FullRoundedButton
                type="submit"
                disabled={!stripe || adding}
                className="w-full sm:w-auto"
              >
                {adding ? "Adding..." : "Add Payment Method"}
              </FullRoundedButton>
              <FullRoundedButton
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  if (elements) {
                    const cardElement = elements.getElement(CardElement);
                    if (cardElement) cardElement.clear();
                  }
                }}
                buttonType="danger"
              >
                Cancel
              </FullRoundedButton>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-white border-2 border-dashed border-neutral-300 rounded-[26px] p-6 hover:border-primary-1 hover:bg-primary-5 transition-colors flex items-center justify-center gap-2 text-primary-1 font-semibold"
        >
          <Plus size={24} />
          Add Payment Method
        </button>
      )}

      {/* Remove Confirmation Modal */}
      <ConfirmMessage
        isOpen={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setPaymentMethodToRemove(null);
        }}
        onOk={handleRemove}
        title="Remove Payment Method"
        description="Are you sure you want to remove this payment method?"
        okText="Yes, Remove"
        cancelText="Cancel"
        type="danger"
        okLoading={isRemoving}
      />

      {/* Update Default Confirmation Modal */}
      <ConfirmMessage
        isOpen={showUpdateDefaultConfirm}
        onClose={() => {
          setShowUpdateDefaultConfirm(false);
          setPaymentMethodToDefault(null);
        }}
        onOk={handleSetDefault}
        title="Set as Default Payment Method"
        description="Do you want to set this payment method as your default for future payments?"
        okText="Set as Default"
        cancelText="Cancel"
        type="primary"
        okLoading={isUpdating}
      />

      {/* Error Message */}
      <ConfirmMessage
        isOpen={showErrorMessage}
        onClose={() => setShowErrorMessage(false)}
        onOk={() => setShowErrorMessage(false)}
        title="Error"
        description={errorMessage || "An error occurred."}
        okText="OK"
        type="danger"
        hideCancelButton={true}
      />
    </div>
  );
}

export default function PaymentMethods(props: PaymentMethodsProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsList {...props} />
    </Elements>
  );
}

