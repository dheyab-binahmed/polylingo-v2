import { useEffect, useState, useRef, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { updatePresence, fetchFriendRequests } from "./services/api";
import { onCallIncoming, offCallIncoming, endCall, onFriendRequest, offFriendRequest } from "./services/socket";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AchievementToaster from "./components/AchievementToaster";
import AuthRequired from "./components/AuthRequired";
import HomePage from "./pages/HomePage";
import LoginPage from "./components/LoginPage";

// Route pages are code-split: each one downloads only when the user visits it,
// so the initial bundle stays small and the app loads faster.
// `lazyWithPreload` also exposes a `.preload()` so we can warm a page's chunk
// in the background (during idle time) and make navigation feel instant.
function lazyWithPreload(factory) {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
}

const AboutPage = lazyWithPreload(() => import("./pages/AboutPage"));
const DashboardPage = lazyWithPreload(() => import("./pages/DashboardPage"));
const PracticePage = lazyWithPreload(() => import("./pages/PracticePage"));
const CommunityPage = lazyWithPreload(() => import("./pages/CommunityPage"));
const FriendsPage = lazyWithPreload(() => import("./pages/Community/FriendsPage"));
const ProfilePage = lazyWithPreload(() => import("./pages/ProfilePage"));
const AssessmentPage = lazyWithPreload(() => import("./pages/Assessment/AssessmentPage"));
const LanguageStep = lazy(() => import("./pages/Assessment/LanguageStep"));
const SpeakingStep = lazy(() => import("./pages/Assessment/SpeakingStep"));
const WritingStep = lazy(() => import("./pages/Assessment/WritingStep"));
const ListeningStep = lazy(() => import("./pages/Assessment/ListeningStep"));
const ReadingStep = lazy(() => import("./pages/Assessment/ReadingStep"));
const ResultsStep = lazy(() => import("./pages/Assessment/ResultsStep"));
const RegisterPage = lazyWithPreload(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));

// Warm a set of route chunks during browser idle time so navigating to them
// is instant (no loading spinner). Safe no-op on browsers without rIC.
function preloadDuringIdle(components) {
  const idle =
    window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  const cancel = window.cancelIdleCallback || clearTimeout;
  const handle = idle(() => {
    components.forEach((c) => {
      try { c.preload?.(); } catch (_) {}
    });
  });
  return () => cancel(handle);
}
import IncomingCallModal from "./components/components/partners/IncomingCallModal";
import Companion from "./components/Companion/Companion";

// Lightweight fallback shown while a route chunk loads.
function RouteFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="auth-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}

// Redirect logged-in users away from the homepage to the dashboard
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null; // avoid flash while session restores
  if (user) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const globalRingRef = useRef(null);
  const [friendRequestCount, setFriendRequestCount] = useState(0);

  // ── Prefetch route chunks during idle time so navigation feels instant ──
  // Logged-in users hop between these pages constantly, so warm them in the
  // background once. Logged-out visitors only get the cheap auth pages warmed.
  useEffect(() => {
    if (user) {
      return preloadDuringIdle([
        DashboardPage,
        PracticePage,
        CommunityPage,
        ProfilePage,
        FriendsPage,
      ]);
    }
    return preloadDuringIdle([RegisterPage]);
  }, [user]);

  // ── Restore dark mode preference on first load ───────────────────────
  useEffect(() => {
    try {
      const settings = JSON.parse(
        localStorage.getItem("polylingo_settings") || "{}",
      );
      document.documentElement.setAttribute(
        "data-dark",
        settings.dark ? "true" : "false",
      );
    } catch (_) {
      document.documentElement.setAttribute("data-dark", "false");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("polylingo_token");
    if (!token) return undefined;

    updatePresence(true).catch(() => {});

    return () => {
      updatePresence(false).catch(() => {});
    };
  }, []);

  // ── Friend request count — fetch on login + poll every 30s ───────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await fetchFriendRequests();
        setFriendRequestCount(data?.incoming?.length || 0);
      } catch (_) {}
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Real-time friend request notifications ─────────────────────────────
  useEffect(() => {
    const handleFriendRequest = () => {
      setFriendRequestCount((c) => c + 1);
    };
    onFriendRequest(handleFriendRequest);
    return () => offFriendRequest(handleFriendRequest);
  }, []);

  // ── Global incoming call listener ────────────────────────────────────
  useEffect(() => {
    const handleIncomingCall = ({ from, offer, callType, callerName }) => {
      console.log("Global incoming call from:", from, "caller:", callerName);

      // Let DMModal claim the call first (synchronous CustomEvent).
      // If DMModal is open with this caller it will call event.preventDefault()
      // to prevent the global modal from also appearing.
      const claimEvent = new CustomEvent("polylingo:incoming-call", {
        cancelable: true,
        detail: { from },
      });
      const claimedByModal = !window.dispatchEvent(claimEvent);
      if (claimedByModal) return;

      setGlobalIncomingCall({ from, offer, callType, callerName });

      // Play ringing sound
      if (typeof Audio !== "undefined") {
        const ring = new Audio(
          "https://cdn.pixabay.com/audio/2022/03/15/audio_1a4e8c3b3b.mp3",
        );
        ring.loop = true;
        ring.play().catch(() => {});
        globalRingRef.current = ring;
      }
    };

    onCallIncoming(handleIncomingCall);

    return () => {
      offCallIncoming(handleIncomingCall);
    };
  }, []);

  const handleAcceptGlobalCall = () => {
    if (!globalIncomingCall) return;

    // Stop ringing
    if (globalRingRef.current) {
      globalRingRef.current.pause();
      globalRingRef.current.currentTime = 0;
      globalRingRef.current = null;
    }

    // Store call for DMModal to handle
    const callData = JSON.stringify(globalIncomingCall);
    sessionStorage.setItem("pendingIncomingCall", callData);

    // Navigate to community and open DM
    navigate("/community", {
      state: {
        openDMWithUserId: globalIncomingCall.from,
        pendingCall: globalIncomingCall,
      },
    });

    setGlobalIncomingCall(null);
  };

  const handleDeclineGlobalCall = () => {
    if (!globalIncomingCall) return;

    // Stop ringing
    if (globalRingRef.current) {
      globalRingRef.current.pause();
      globalRingRef.current.currentTime = 0;
      globalRingRef.current = null;
    }

    // Emit end call
    endCall(globalIncomingCall.from);
    setGlobalIncomingCall(null);
  };

  return (
    <>
      {globalIncomingCall && (
        <IncomingCallModal
          caller={{ name: globalIncomingCall.callerName }}
          callType={globalIncomingCall.callType}
          onAccept={handleAcceptGlobalCall}
          onDecline={handleDeclineGlobalCall}
        />
      )}
      <Navbar
        friendRequestCount={friendRequestCount}
        onResetFriendCount={() => setFriendRequestCount(0)}
      />
      <AchievementToaster />
      <main className="main-content">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected Routes - Assessment gate removed, users can access directly */}
          <Route
            path="/dashboard"
            element={
              <AuthRequired>
                <DashboardPage />
              </AuthRequired>
            }
          />
          <Route
            path="/practice"
            element={
              <AuthRequired>
                <PracticePage />
              </AuthRequired>
            }
          />
          <Route
            path="/community"
            element={
              <AuthRequired>
                <CommunityPage />
              </AuthRequired>
            }
          />
          <Route
            path="/community/friends"
            element={
              <AuthRequired>
                <FriendsPage />
              </AuthRequired>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthRequired>
                <ProfilePage />
              </AuthRequired>
            }
          />

          {/* Assessment - requires login but NOT completed assessment */}
          <Route
            path="/assessment"
            element={
              <AuthRequired>
                <AssessmentPage />
              </AuthRequired>
            }
          >
            <Route
              index
              element={<Navigate to="/assessment/language" replace />}
            />
            <Route path="language" element={<LanguageStep />} />
            <Route path="speaking" element={<SpeakingStep />} />
            <Route path="writing" element={<WritingStep />} />
            <Route path="listening" element={<ListeningStep />} />
            <Route path="reading" element={<ReadingStep />} />
            <Route path="results" element={<ResultsStep />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      <Companion />
    </>
  );
}
