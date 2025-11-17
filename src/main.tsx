import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";
import { CONVEX_URL, HAS_CONVEX_BACKEND } from "@/lib/config";

const convex = HAS_CONVEX_BACKEND
  ? new ConvexReactClient(CONVEX_URL as string)
  : null;

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <RouteSyncer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage redirectAfterAuth="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppProviders() {
  return (
    <StrictMode>
      <VlyToolbar />
      <InstrumentationProvider>
        {convex ? (
          <ConvexAuthProvider client={convex}>
            <AppRouter />
          </ConvexAuthProvider>
        ) : (
          <AppRouter />
        )}
        <Toaster />
      </InstrumentationProvider>
    </StrictMode>
  );
}

if (!HAS_CONVEX_BACKEND) {
  console.warn(
    "[rt-2-demo] VITE_CONVEX_URL is not set. Backend features will run in demo mode.",
  );
}

createRoot(document.getElementById("root")!).render(<AppProviders />);
