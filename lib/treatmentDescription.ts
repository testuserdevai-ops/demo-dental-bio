/**
 * The existing treatment and service description maximum.
 *
 * No separate product limit is documented, so this preserves the application's
 * previous effective maximum while giving the client and server one source of
 * truth.
 */
export const TREATMENT_DESCRIPTION_MAX_LENGTH = 200;

export interface TreatmentDescriptionState {
  value: string;
}

export type TreatmentDescriptionAction =
  | { type: "change"; value: string }
  | { type: "editStarted"; value: string }
  | { type: "submissionFailed" }
  | { type: "submissionSucceeded" };

export const EMPTY_TREATMENT_DESCRIPTION: TreatmentDescriptionState = {
  value: "",
};

export function treatmentDescriptionReducer(
  state: TreatmentDescriptionState,
  action: TreatmentDescriptionAction,
): TreatmentDescriptionState {
  switch (action.type) {
    case "change":
    case "editStarted":
      return { value: action.value };
    case "submissionSucceeded":
      return EMPTY_TREATMENT_DESCRIPTION;
    case "submissionFailed":
      return state;
  }
}

export function treatmentDescriptionCount(value: string): number {
  return value.length;
}
