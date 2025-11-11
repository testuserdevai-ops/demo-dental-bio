import { useState, useEffect } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { CaretDown } from "@phosphor-icons/react";
import LabeledInput from "@/app/dashboard/components/LabeledInput";
import CustomDatePicker from "@/app/components/DatePicker/DatePicker";
import SaveButton from "@/app/dashboard/components/SaveButton";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string, subscription_status: string, current_period_end: Date | null) => void;
  user: any;
}

const UpgradePlanModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [period_end, setPeriodEnd] = useState<Date | null>(null);
  const [planName, setPlanName] = useState<string>(user?.subscription_status || "FREE");
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setError('')
    setPlanName(user?.subscription_status || "FREE")
    setPeriodEnd(null)
  }, [isOpen])

  const handleSubmit = async () => {
    setError('');

    setIsUploading(true);
    const userId = user.id;

    const endDate = planName === 'FREE' ? null : period_end || new Date("9999-12-31");

    const response = await fetch("/api/subscription", {
      method: "POST",
      body: JSON.stringify({ id: userId, subscription_status: planName, current_period_end: endDate }),
    });

    const data = await response.json();

    if (data.error) {
      console.error(data.error);
      setError(error)
    } else {
      onSuccess(userId, planName, endDate);
      onClose();
    }
    setIsUploading(false);
  }

  const plans = ["FREE", "PRO", "PREMIUM PRO"];

  return (
    <>
      {isOpen &&
        <div
          className={`modal-overlay overflow-auto fixed bg-[#00000080] cursor-pointer z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={onClose}
        >
          <div
            className="w-[600px] overflow-hidden cursor-auto flex flex-col rounded-[26px] cursor- bg-[#F3F3F1] p-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Upgrade Plan</h3>
            <form action={handleSubmit}>
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="flex-col-gap">
                  <LabeledInput
                    label="First Name"
                    defaultValue={user.first_name}
                    name="first_name"
                    className="w-full text-base"
                    readOnly
                  />
                  <LabeledInput
                    label="Last Name"
                    defaultValue={user.last_name}
                    name="last_name"
                    className="w-full text-base"
                    readOnly
                  />
                  <LabeledInput
                    label="Email"
                    defaultValue={user.email}
                    name="email"
                    className="w-full text-base"
                    readOnly
                  />
                  <LabeledInput
                    label="Current Plan"
                    defaultValue={user.subscription_status || "Free"}
                    name="subscription_status"
                    className="w-full text-base"
                    readOnly
                  />
                </div>

                <h4 className="text-base font-semibold mb-2">Select Plan</h4>
                <div className="relative mb-3">
                  <select
                    name="plan"
                    className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
                    defaultValue={user?.subscription_status || ""}
                    onChange={(e) => setPlanName(e.target.value)}
                  >
                    {plans.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={20}
                    weight="bold"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
                  />
                </div>

                <CustomDatePicker
                  name="date"
                  selectedDate={period_end}
                  onChange={setPeriodEnd}
                  className="w-full mb-2 h-[50px]"
                  label="Period End Date"
                />

                {error && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-red-600 bg-red-100 borde rounded-full p-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.366-.77 1.42-.77 1.786 0l6.518 13.717c.334.703-.184 1.484-.964 1.484H2.403c-.78 0-1.298-.78-.964-1.484L8.257 3.1zm.892 10.902a1.15 1.15 0 100 2.3 1.15 1.15 0 000-2.3zM9 8.75a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 019 8.75z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

              </div>
              <div className="flex justify-end gap-2 mt-4">
                <SaveButton text="Upgrade" loadingText="Upgrading" />
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>
                  Close
                </FullRoundedButton>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
};

export default UpgradePlanModal;
