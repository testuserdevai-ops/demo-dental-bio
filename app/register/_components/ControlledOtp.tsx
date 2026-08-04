import { useState } from "react";

import { RegistrationOtpInput } from "./RegistrationOtpInput";

export function ControlledOtp({ error }: { error?: string }) {
  const [value, setValue] = useState("");

  return (
    <RegistrationOtpInput value={value} onChange={setValue} error={error} />
  );
}
