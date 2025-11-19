import { api } from "@/convex/_generated/api";
import { HAS_CONVEX_BACKEND } from "@/lib/config";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";

// Simple type to avoid deep type instantiation
type UserResult = {
  _id: string;
  _creationTime: number;
  name?: string;
  image?: string;
  email?: string;
  emailVerificationTime?: number;
  isAnonymous?: boolean;
  role?: string;
} | null | undefined;

// Wrapper to break type inference
function useCurrentUser(): UserResult {
  // @ts-ignore - Bypass deep type instantiation error from Convex 1.29.1
  return useQuery(api.users.currentUser);
}

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
  const rawUser = useCurrentUser();
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded and user data are available
  // It ensures we only show content when both authentication state and user data are ready
  useEffect(() => {
    if (!isAuthLoading && rawUser !== undefined) {
      setIsLoading(false);
    }
  }, [isAuthLoading, rawUser]);

  return {
    isLoading,
    isAuthenticated,
    user: rawUser ?? null,
    signIn,
    signOut,
  };
}