export function RegistrationAvailabilityHeader({
  domain,
  username,
}: {
  domain: string;
  username: string;
}) {
  return (
    <>
      <p className="text-sm font-semibold text-foreground">Congratulations!</p>
      <p className="break-words text-2xl font-bold text-primary sm:text-3xl">
        {domain}/{username}
      </p>
      <p className="text-sm text-muted-foreground">
        is available, make it yours:
      </p>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
        Almost there
      </h1>
    </>
  );
}
