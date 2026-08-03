"use client";

import {
  At,
  CalendarPlus,
  CaretDown,
  Certificate,
  Phone,
  Subtitles,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import LabeledInput from "./LabeledInput";
import LimitedTextArea from "./LimitedTextArea";
import SaveButton from "./SaveButton";
import { positions } from "@/utils/global_constants";
import React, { useState, useEffect } from "react";
import Dropdown from "@/app/components/Dropdown";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { profileSchema, zodFieldErrors } from "@/lib/validation";

type ProfileEditorProps = {
  dentistry: any;
  user: any;
  userId: string;
};

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  user,
  dentistry,
  userId,
}) => {
  const [bookingLink, setBookingLink] = useState(dentistry?.booking_link || "");
  const [bookingLinkEnabled, setBookingLinkEnabled] = useState(
    dentistry?.booking_link_enabled || false,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const domainConfig = useDomainConfig();

  // Function to validate booking link
  const isValidBookingLink = (link: string) => {
    return link && link.trim() !== "";
  };

  // Handle booking link changes
  const handleBookingLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setBookingLink(newValue);

    // Auto-control switch based on link validity
    if (isValidBookingLink(newValue) && !bookingLinkEnabled) {
      setBookingLinkEnabled(true);
    } else if (!isValidBookingLink(newValue) && bookingLinkEnabled) {
      setBookingLinkEnabled(false);
    }
  };

  // Handle switch toggle
  const handleSwitchToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingLinkEnabled(e.target.checked);
  };

  // Ref to attach validation to the parent form
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    const handleSubmit = (e: SubmitEvent) => {
      const formData = new FormData(form);
      const result = profileSchema.safeParse({
        about_title: formData.get("about_title"),
        about_text: formData.get("about_text"),
        gdc_no: formData.get("gdc_no"),
        qualification: formData.get("qualification"),
        phone: formData.get("phone"),
        contact_email: formData.get("contact_email"),
        booking_link: formData.get("booking_link"),
        website: formData.get("website"),
      });

      if (!result.success) {
        e.preventDefault();
        setErrors(zodFieldErrors(result.error));
      }
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  return (
    <div className="flex-col-gap" ref={containerRef}>
      <input type="hidden" name="userId" value={userId} />
      <h2 className="text-lg font-semibold">Name</h2>
      <LabeledInput
        label="Profile Title"
        defaultValue={dentistry?.about_title || ""}
        name="about_title"
        className="w-full text-base"
        error={errors.about_title}
        onChange={() =>
          errors.about_title &&
          setErrors((prev) => ({ ...prev, about_title: "" }))
        }
      />

      <h2 className="text-lg font-semibold">Bio</h2>
      <LimitedTextArea
        name="about_text"
        defaultText={dentistry?.about_text || ""}
        placeholder="About text"
        tooltip={true}
        tooltipText="A brief summary about you and your professional background. Displayed on your profile."
        error={errors.about_text}
        onChange={() =>
          errors.about_text &&
          setErrors((prev) => ({ ...prev, about_text: "" }))
        }
      />

      <Dropdown
        name="position"
        selected={user.position}
        onSelect={() => {}}
        options={domainConfig.positions || positions}
        label="Position"
      />

      <LabeledInput
        label="GDC / Professional Body Reg No. (optional)"
        defaultValue={user?.gdc_no || ""}
        name="gdc_no"
        tooltip={true}
        tooltipText="GDC or other professional body registration number."
        className="w-full text-sm md:text-base pl-7"
        error={errors.gdc_no}
        onChange={() =>
          errors.gdc_no && setErrors((prev) => ({ ...prev, gdc_no: "" }))
        }
      >
        <Subtitles
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Qualification (optional)"
        defaultValue={user?.qualification || ""}
        name="qualification"
        className="w-full text-sm md:text-base pl-7"
        error={errors.qualification}
        onChange={() =>
          errors.qualification &&
          setErrors((prev) => ({ ...prev, qualification: "" }))
        }
      >
        <Certificate
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Contact Phone (optional)"
        defaultValue={dentistry?.phone || ""}
        name="phone"
        className="w-full text-sm md:text-base pl-7"
        error={errors.phone}
        onChange={() =>
          errors.phone && setErrors((prev) => ({ ...prev, phone: "" }))
        }
      >
        <Phone
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Contact Email (optional)"
        defaultValue={dentistry?.contact_email || ""}
        name="contact_email"
        type="email"
        className="w-full text-sm md:text-base pl-7"
        error={errors.contact_email}
        onChange={() =>
          errors.contact_email &&
          setErrors((prev) => ({ ...prev, contact_email: "" }))
        }
      >
        <At
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Booking Link (optional)"
        className="w-full flex-grow text-base pl-7"
        name="booking_link"
        value={bookingLink}
        tooltip={true}
        tooltipText="A link where others can book an appointment or meeting with you (e.g., Calendly)."
        onChange={(e) => {
          handleBookingLinkChange(e);
          errors.booking_link &&
            setErrors((prev) => ({ ...prev, booking_link: "" }));
        }}
        hasSwitch={true}
        isChecked={bookingLinkEnabled}
        onSwitchToggle={handleSwitchToggle}
        error={errors.booking_link}
      >
        <CalendarPlus
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Website Link (optional)"
        defaultValue={dentistry?.website || ""}
        name="website"
        className="w-full text-sm md:text-base pl-7"
        error={errors.website}
        onChange={() =>
          errors.website && setErrors((prev) => ({ ...prev, website: "" }))
        }
      >
        <LinkSimple
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="booking_link_enabled"
        value={bookingLinkEnabled.toString()}
      />

      {/* Save Button for Dentistry */}
      <div className="w-full flex items-end justify-end">
        <SaveButton />
      </div>
    </div>
  );
};

export default ProfileEditor;
