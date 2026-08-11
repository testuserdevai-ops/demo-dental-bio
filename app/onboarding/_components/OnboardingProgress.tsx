const steps = ["Color theme", "Template", "Profile questions"] as const;

export function OnboardingProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Profile setup progress">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number === current;
          const complete = number < current;
          return (
            <li
              key={label}
              className="flex min-w-0 flex-col gap-2 text-xs font-bold sm:text-sm"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={
                  active || complete
                    ? "h-1.5 rounded-full bg-primary"
                    : "h-1.5 rounded-full bg-border"
                }
              />
              <span
                className={`${active ? "block text-foreground" : "hidden text-muted-foreground"} sm:block`}
              >
                <span className="sr-only">Step {number}: </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
