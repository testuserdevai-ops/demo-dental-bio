export type DashboardScope = {
  readonly effectiveUserId: string;
  readonly dentistryId: string;
  readonly username: string;
  readonly canManageSubscription: boolean;
};

export type DashboardShellViewModel = {
  subscriptionStatus: string | null;
  isVerified: boolean;
  useDentalBrand: boolean;
  position: string | null;
  createdAt: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
};

export type DashboardProfileIdentity = {
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
};

export type ResolvedDashboardIdentity = {
  scope: DashboardScope;
  shell: DashboardShellViewModel;
  profileIdentity?: DashboardProfileIdentity;
};
