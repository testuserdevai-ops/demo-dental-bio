import Cookies from "js-cookie";

const TARGET_USER_COOKIE_KEY = "targetUserId";

export const useAdmin = () => {
  const setTargetUserId = (userId: string) => {
    Cookies.set(TARGET_USER_COOKIE_KEY, userId, {
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  };

  const getTargetUserId = (): string | null => {
    return Cookies.get(TARGET_USER_COOKIE_KEY) || null;
  };

  return {
    setTargetUserId,
    getTargetUserId,
  };
};
