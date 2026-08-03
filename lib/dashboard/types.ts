export type DashboardScope = {
  effectiveUserId: string;
  dentistryId: string;
  username: string;
};

export type DashboardShellViewModel = {
  subscriptionStatus: string | null;
  isVerified: boolean;
  useDentalBrand: boolean;
};

export type ResolvedDashboardIdentity = {
  scope: DashboardScope;
  shell: DashboardShellViewModel;
};
