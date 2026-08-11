export default function AppearanceOnboardingLoading() {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-7xl animate-pulse px-5 py-8 motion-reduce:animate-none sm:px-8 sm:py-12"
      aria-busy="true"
      aria-label="Loading appearance choices"
    >
      <div className="mx-auto h-12 max-w-3xl rounded-[var(--radius-md)] bg-muted" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <div className="h-10 w-2/3 rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="h-56 rounded-[var(--radius-lg)] bg-muted"
                key={index}
              />
            ))}
          </div>
        </div>
        <div className="h-96 rounded-[var(--radius-lg)] bg-muted" />
      </div>
    </main>
  );
}
