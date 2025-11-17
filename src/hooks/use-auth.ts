import { api } from "@/convex/_generated/api";
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
  return useQuery(api.users.currentUser) as any;
}

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const rawUser = useCurrentUser();
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded and user data is available
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