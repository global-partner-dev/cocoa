import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import RegisterPage from "./components/auth/RegisterPage";
import LoginPage from "./components/auth/LoginPage";
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const UserManagement = lazy(() => import("./components/dashboard/UserManagement"));
const ContestManagement = lazy(() => import("./components/dashboard/ContestManagement"));
const ContestCleanupPage = lazy(() => import("./components/dashboard/ContestCleanupPage"));
const SampleManagement = lazy(() => import("./components/dashboard/SampleManagement"));
const PlaceholderPage = lazy(() => import("./components/dashboard/PlaceholderPage"));
const FinanceManagement = lazy(() => import("./components/dashboard/FinanceManagement"));
const PhysicalEvaluation = lazy(() => import("./components/dashboard/PhysicalEvaluation"));
const SampleAssignment = lazy(() => import("./components/dashboard/SampleAssignment"));
const EvaluationSupervision = lazy(() => import("./components/dashboard/EvaluationSupervision"));
const JudgeDashboard = lazy(() => import("./components/dashboard/JudgeDashboard"));
const JudgeContests = lazy(() => import("./components/dashboard/JudgeContests"));
const SampleSubmission = lazy(() => import("./components/dashboard/SampleSubmission"));
const ParticipantResults = lazy(() => import("./components/dashboard/ParticipantResults"));
const FinalResults = lazy(() => import("./components/dashboard/FinalResults"));
const SmartNotifications = lazy(() => import("./components/dashboard/SmartNotifications"));
const SmartDashboard = lazy(() => import("./components/dashboard/SmartDashboard"));
const MyProfile = lazy(() => import("./components/dashboard/MyProfile"));
const DirectAuthTest = lazy(() => import("./components/debug/DirectAuthTest"));
const QRVerification = lazy(() => import("./pages/QRVerification"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[hsl(var(--chocolate-dark))]"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
            <Route path="/debug-auth" element={<DirectAuthTest />} />
            <Route path="/verify/:trackingCode" element={<QRVerification />} />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SmartDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/contests"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ContestManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/contest-cleanup"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ContestCleanupPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/samples"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SampleManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/finance"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <FinanceManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/judges"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <JudgeContests />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/evaluation"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <JudgeDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SmartNotifications />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/submission"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SampleSubmission />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/results"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ParticipantResults />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/final-results"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <FinalResults />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/physical-evaluation"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PhysicalEvaluation />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/sample-assignment"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SampleAssignment />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/evaluation-supervision"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EvaluationSupervision />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MyProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
