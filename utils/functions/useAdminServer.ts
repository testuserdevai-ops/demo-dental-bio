import { cookies } from "next/headers";

const TARGET_USER_COOKIE_KEY = "targetUserId";

export const AdminServer = {
  setTargetUserId: async (userId: string) => {
    const cookieStore = await cookies();

    cookieStore.set(TARGET_USER_COOKIE_KEY, userId, {
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  },

  getTargetUserId: async (): Promise<string | null> => {
    const cookieStore = await cookies();

    return cookieStore.get(TARGET_USER_COOKIE_KEY)?.value || null;
  },
};
