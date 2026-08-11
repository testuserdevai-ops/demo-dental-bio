export default function TemplateQuestionsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading profile questions"
      className="mx-auto min-h-screen w-full max-w-5xl animate-pulse px-5 py-8 motion-reduce:animate-none sm:px-8 sm:py-12"
    >
      <div className="mx-auto h-12 max-w-3xl rounded-[var(--radius-md)] bg-muted" />
      <div className="mx-auto mt-10 max-w-3xl space-y-5">
        <div className="h-10 w-2/3 rounded bg-muted" />
        <div className="h-20 rounded bg-muted" />
        <div className="h-80 rounded-[var(--radius-lg)] bg-muted" />
      </div>
    </main>
  );
}
