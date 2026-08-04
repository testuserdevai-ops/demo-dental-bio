import { mock } from "bun:test";

const defaultPathname = "/dashboard";

let pathname = defaultPathname;
let searchParams = new URLSearchParams();

export const navigationSpies = {
  back: mock(() => {}),
  forward: mock(() => {}),
  prefetch: mock(async () => {}),
  push: mock((_href: string) => {}),
  refresh: mock(() => {}),
  replace: mock((_href: string) => {}),
};

export function resetNavigationMocks() {
  pathname = defaultPathname;
  searchParams = new URLSearchParams();

  for (const spy of Object.values(navigationSpies)) {
    spy.mockClear();
  }
}

export function setMockPathname(value: string) {
  pathname = value;
}

export function setMockSearchParams(value: URLSearchParams) {
  searchParams = value;
}

mock.module("next/navigation", () => ({
  forbidden: () => {
    throw new Error("forbidden");
  },
  notFound: () => {
    throw new Error("not-found");
  },
  permanentRedirect: (href: string) => {
    throw new Error(`permanent-redirect:${href}`);
  },
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
  unauthorized: () => {
    throw new Error("unauthorized");
  },
  useParams: () => ({}),
  usePathname: () => pathname,
  useRouter: () => navigationSpies,
  useSearchParams: () => searchParams,
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
}));
