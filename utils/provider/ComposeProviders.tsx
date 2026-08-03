import React from "react";

const composeProviders = (
  ...providers: React.FC<{ children: React.ReactNode }>[]
) => {
  return providers.reduce(
    (AccumulatedProviders, CurrentProvider) =>
      ({ children }: { children: React.ReactNode }) => (
        <AccumulatedProviders>
          <CurrentProvider>{children}</CurrentProvider>
        </AccumulatedProviders>
      ),
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
  );
};

export default composeProviders;
