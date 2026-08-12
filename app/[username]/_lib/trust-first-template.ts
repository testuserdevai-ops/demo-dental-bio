import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

type Review = {
  id: number;
  content: string | null;
  stars: number | null;
  rank: number | null;
  reviewer_name?: string | null;
};

type Treatment = {
  treatment_id: string;
  rank: number;
  treatments: {
    title: string | null;
    description: string | null;
    isService: boolean | null;
  } | null;
};

export type TrustPriorityInformation = NonNullable<
  ProfileTemplateAnswers["trust-first-family-practice"]["priorityInformation"]
>[number];

export const TRUST_PRIORITY_COPY: Record<
  TrustPriorityInformation,
  { title: string; description: string }
> = {
  payment: {
    title: "Payment options",
    description:
      "Ask the practice about ways to plan and spread treatment costs.",
  },
  insurance: {
    title: "Insurance support",
    description:
      "Contact the team to check your policy and available claim support.",
  },
  accessibility: {
    title: "Accessible visits",
    description:
      "Tell the team what would make your appointment easier before you arrive.",
  },
  "anxiety-care": {
    title: "Anxiety-aware care",
    description:
      "Share any worries in advance so your appointment can move at a comfortable pace.",
  },
};

function hasReviewContent(review: Review) {
  return Boolean(review.content?.trim() || review.stars);
}

export function selectTrustFirstReviews(
  answers: ProfileTemplateAnswers["trust-first-family-practice"],
  reviews: readonly Review[],
) {
  const eligible = reviews.filter(hasReviewContent);
  const byId = new Map(eligible.map((review) => [String(review.id), review]));

  if (answers.featuredReviewIds?.length) {
    return answers.featuredReviewIds
      .flatMap((id) => {
        const review = byId.get(id);
        return review ? [review] : [];
      })
      .slice(0, 2);
  }

  return eligible
    .slice()
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) -
        (b.rank ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 2);
}

export function selectTrustFirstTreatments(treatments: readonly Treatment[]) {
  return treatments
    .filter(
      (treatment) =>
        treatment.treatments && treatment.treatments.isService !== true,
    )
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
}

export function getTrustPriorityInformation(
  answers: ProfileTemplateAnswers["trust-first-family-practice"],
) {
  return (answers.priorityInformation ?? []).map((id) => ({
    id,
    ...TRUST_PRIORITY_COPY[id],
  }));
}

export function normalizeTrustFirstHttpUrl(value: string | null) {
  const input = value?.trim();
  if (!input) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
