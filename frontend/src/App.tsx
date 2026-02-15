import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedCandidateRoute } from './components/ProtectedCandidateRoute';
import { ProtectedHRRoute } from './components/ProtectedHRRoute';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { Dashboard } from './pages/Dashboard';
import { Candidates } from './pages/Candidates';
import { Jobs } from './pages/Jobs';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { HRLogin } from './pages/HRLogin';
import { AdminLogin } from './pages/AdminLogin';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { Applications } from './pages/Applications';
import { ApplyJob } from './pages/ApplyJob';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ManageHR } from './pages/ManageHR';
import { CandidateChatbot } from './pages/CandidateChatbot';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Legacy Protected Route Wrapper (kept for backward compat)
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: ('candidate' | 'hr' | 'admin')[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">Loading...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allowedRoles.includes(user.role!)) {
    // Smart redirect based on role
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'hr') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/candidate-dashboard" replace />;
  }

  return <Outlet />;
};

// Placeholder page for future admin sections
const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-slate-400">This section is coming soon.</p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/hr/login" element={<HRLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Authenticated Routes with existing Layout */}
      <Route element={<Layout />}>

        {/* Shared Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hr', 'candidate']} />}>
          <Route path="/jobs" element={<Jobs />} />
        </Route>

        {/* HR Only Routes */}
        <Route element={<ProtectedHRRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/candidates" element={<Candidates />} />
        </Route>

        {/* Candidate Only Routes */}
        <Route element={<ProtectedCandidateRoute />}>
          <Route path="/welcome" element={<Navigate to="/candidate-dashboard" replace />} />
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/apply/:jobId" element={<ApplyJob />} />
          <Route path="/career-assistant" element={<CandidateChatbot />} />
        </Route>

      </Route>

      {/* Admin Routes with Admin Layout */}
      <Route element={<AdminLayout />}>
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/hr" element={<ManageHR />} />
          <Route path="/admin/jobs" element={<ComingSoonPage title="Manage Jobs" />} />
          <Route path="/admin/candidates" element={<ComingSoonPage title="View Candidates" />} />
          <Route path="/admin/analytics" element={<ComingSoonPage title="Detailed Analytics" />} />
          <Route path="/admin/settings" element={<ComingSoonPage title="Settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
