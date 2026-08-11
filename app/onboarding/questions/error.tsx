"use client";

import { Button } from "@/app/components/ui/button";

export default function TemplateQuestionsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-5 py-12 text-center">
      <h1 className="text-3xl font-bold text-foreground">
        We could not load your profile questions
      </h1>
      <p className="text-muted-foreground">
        Your private draft and published profile have not changed. Check your
        connection and try loading this step again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
