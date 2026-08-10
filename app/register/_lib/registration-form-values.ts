import type { z } from "zod";

import type { registrationSchema } from "@/lib/auth/schemas";

export type RegistrationFormValues = z.input<typeof registrationSchema>;
