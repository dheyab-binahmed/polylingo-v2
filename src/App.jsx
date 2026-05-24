import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { updatePresence } from "./services/api";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import PracticePage from "./pages/PracticePage";
import CommunityPage from "./pages/CommunityPage";
import FriendsPage from "./pages/Community/FriendsPage";
import ProfilePage from "./pages/ProfilePage";
import AssessmentPage from "./pages/Assessment/AssessmentPage";
import LanguageStep from "./pages/Assessment/LanguageStep";
import PronunciationStep from "./pages/Assessment/PronunciationStep";
import SpeakingStep from "./pages/Assessment/SpeakingStep";
import GrammarStep from "./pages/Assessment/GrammarStep";
import ReadingStep from "./pages/Assessment/ReadingStep";
import ResultsStep from "./pages/Assessment/ResultsStep";
import PronunciationDetailsPage from "./pages/Assessment/PronunciationDetailsPage";
import AuthRequired from "./components/AuthRequired";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  // ── Restore dark mode preference on first load ───────────────────────
  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem("polylingo_settings") || "{}");
      document.documentElement.setAttribute("data-dark", settings.dark ? "true" : "false");
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

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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
              <Route path="pronunciation" element={<PronunciationStep />} />
              <Route path="speaking" element={<SpeakingStep />} />
              <Route path="grammar" element={<GrammarStep />} />
              <Route path="reading" element={<ReadingStep />} />
              <Route path="results" element={<ResultsStep />} />
              <Route
                path="pronunciation-details"
                element={<PronunciationDetailsPage />}
              />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
