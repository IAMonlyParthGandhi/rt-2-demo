import { api } from "@/convex/_generated/api";
import { HAS_CONVEX_BACKEND } from "@/lib/config";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useAuth() {
  if (!HAS_CONVEX_BACKEND) {
    return {
      isLoading: false,
      isAuthenticated: false,
      user: null,
      signIn: async () => {
        console.warn(
          "[rt-2-demo] Auth actions require a Convex backend. Configure VITE_CONVEX_URL to enable sign-in.",
        );
      },
      signOut: async () => {
        console.warn(
          "[rt-2-demo] Auth actions require a Convex backend. Configure VITE_CONVEX_URL to enable sign-out.",
        );
      },
    } as const;
  }

  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded and user data is available
  // It ensures we only show content when both authentication state and user data are ready
  useEffect(() => {
    if (!isAuthLoading && user !== undefined) {
      setIsLoading(false);
    }
  }, [isAuthLoading, user]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
