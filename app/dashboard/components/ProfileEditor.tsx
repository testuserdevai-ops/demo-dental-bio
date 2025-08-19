'use client'

import { At, CalendarPlus, CaretDown, Certificate, Phone, Subtitles, LinkSimple } from "@phosphor-icons/react/dist/ssr"
import LabeledInput from "./LabeledInput"
import LimitedTextArea from "./LimitedTextArea"
import SaveButton from "./SaveButton"
import { positions } from "@/utils/global_constants"
import React, { useState, useEffect } from "react"
import Switcher from '@/app/components/Switcher'

type ProfileEditorProps = {
  dentistry: any;
  user: any;
  userId: string;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, dentistry, userId }) => {
  const [bookingLink, setBookingLink] = useState(dentistry?.booking_link || "");
  const [bookingLinkEnabled, setBookingLinkEnabled] = useState(dentistry?.booking_link_enabled || false);

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

  return (
    <>
      <input type="hidden" name="userId" value={userId} />
      <h2 className="text-lg font-semibold mb-3">Name</h2>
      <LabeledInput
        label="Profile Title"
        defaultValue={dentistry?.about_title || ""}
        name="about_title"
        className="w-full text-base"
      />

      <h2 className="text-lg font-semibold mb-3">Bio</h2>
      <LimitedTextArea
        name="about_text"
        defaultText={dentistry?.about_text || ""}
        placeholder="About text"
        tooltip={true}
        tooltipText="A brief summary about you and your professional background. Displayed on your profile."
      />

      {/* Position Dropdown */}
      <div className="mb-3 relative">
        <h2 className="text-base text-dark mb-3">Position</h2>
        <div className="relative">
          <select
            name="position"
            className="w-full appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
            defaultValue={user?.position || ""}
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
          <CaretDown
            size={20}
            weight="bold"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
        </div>
      </div>

      <LabeledInput
        label="GDC / Professional Body Reg No. (optional)"
        defaultValue={user?.gdc_no || ""}
        name="gdc_no"
        tooltip={true}
        tooltipText="GDC or other professional body registration number."
        className="w-full text-base pl-7">
        <Subtitles
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Qualification (optional)"
        defaultValue={user?.qualification || ""}
        name="qualification"
        className="w-full text-base pl-7">
        <Certificate
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <LabeledInput
        label="Contact Phone (optional)"
        defaultValue={dentistry?.phone || ""}
        name="phone"
        className="w-full text-base pl-7">
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
        className="w-full text-base pl-7">
        <At
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      <div className="w-full flex justify-between items-center gap-3">
        <LabeledInput
          label="Booking Link (optional)"
          className="w-full flex-grow text-base pl-7"
          name="booking_link"
          value={bookingLink}
          tooltip={true}
          tooltipText="A link where others can book an appointment or meeting with you (e.g., Calendly)."
          onChange={handleBookingLinkChange}
        >
          <CalendarPlus
            size={24}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
          />
        </LabeledInput>
        <div className="relative inline-block w-8 h-5">
          <input
            checked={bookingLinkEnabled}
            id="switch-component-blue"
            type="checkbox"
            className="peer appearance-none w-8 h-5 bg-white border-grey-500 border-[1px] rounded-full checked:bg-[#7d71e5] cursor-pointer transition-colors duration-300"
            onChange={handleSwitchToggle}
          />
          <label htmlFor="switch-component-blue" className="absolute top-0 left-[2px] w-[14px] h-[14px] mt-[3px] bg-[#86B7FE] rounded-full shadow-sm transition-transform duration-300 peer-checked:translate-x-4 peer-checked:border-grey-500 peer-checked:bg-white cursor-pointer">
          </label>
        </div>
      </div>

      <LabeledInput
        label="Website Link (optional)"
        defaultValue={dentistry?.website || ""}
        name="website"
        className="w-full text-base pl-7">
        <LinkSimple
          size={24}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
        />
      </LabeledInput>

      {/* Hidden input for form submission */}
      <input type="hidden" name="booking_link_enabled" value={bookingLinkEnabled.toString()} />

      {/* Save Button for Dentistry */}
      <div className="w-full flex items-end justify-end">
        <SaveButton />
      </div>
    </>
  )
}

export default ProfileEditor;