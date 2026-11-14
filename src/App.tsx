import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FirstPageIntake } from './pages/FirstPageIntake';
import { QuickQuizPage } from './pages/QuickQuizPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SkillAnalysisPage } from './pages/SkillAnalysisPage';
import { CareerRecommendationsPage } from './pages/CareerRecommendationsPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { LessonDetailPage } from './pages/LessonDetailPage';
import { WeeklyProgressPage } from './pages/WeeklyProgressPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { MentorPage } from './pages/MentorPage';
import { AgentActivityPage } from './pages/AgentActivityPage';
import { SettingsPage } from './pages/SettingsPage';

function getIncompleteTarget(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  return user.profile?.careerInterest || user.profile?.unsureCareer ? '/quick-quiz' : '/onboarding';
}

function ProtectedRoute({
  children,
  requireCompleteProfile = true,
}: {
  children: React.ReactNode;
  requireCompleteProfile?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F5F2] dark:bg-slate-950 text-sm text-slate-600 dark:text-slate-400">
        Loading SkillPath AI...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireCompleteProfile && !user.profileCompleted) {
    return <Navigate to={getIncompleteTarget(user)} replace />;
  }

  return <>{children}</>;
}

function FirstPageRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F5F2] dark:bg-slate-950 text-sm text-slate-600 dark:text-slate-400">
        Loading SkillPath AI...
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.profileCompleted ? '/dashboard' : getIncompleteTarget(user)} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FirstPageRoute />} />
            <Route path="/start" element={<FirstPageIntake />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route
              path="/quick-quiz"
              element={
                <ProtectedRoute requireCompleteProfile={false}>
                  <QuickQuizPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireCompleteProfile={false}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute><SkillAnalysisPage /></ProtectedRoute>} />
            <Route path="/careers" element={<ProtectedRoute><CareerRecommendationsPage /></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
            <Route path="/lesson/:taskId" element={<ProtectedRoute><LessonDetailPage /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><WeeklyProgressPage /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
            <Route path="/assessments" element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>} />
            <Route path="/mentor" element={<ProtectedRoute><MentorPage /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentActivityPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<FirstPageRoute />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
