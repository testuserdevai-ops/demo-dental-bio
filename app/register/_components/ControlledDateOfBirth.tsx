import { useState } from "react";

import { DateOfBirthField } from "./DateOfBirthField";

export function ControlledDateOfBirth() {
  const [value, setValue] = useState("");

  return (
    <DateOfBirthField
      value={value}
      onChange={setValue}
      onBlur={() => undefined}
    />
  );
}
