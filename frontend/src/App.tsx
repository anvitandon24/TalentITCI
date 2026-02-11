import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Candidates } from './pages/Candidates';
import { Jobs } from './pages/Jobs';
import { Login } from './pages/Login';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { Applications } from './pages/Applications';
import { ApplyJob } from './pages/ApplyJob';
import { LandingPage } from './pages/LandingPage';

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: ('candidate' | 'hr')[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">Loading...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allowedRoles.includes(user.role!)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

      {/* Authenticated Routes with Layout */}
      <Route element={<Layout />}>

        {/* Shared Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hr', 'candidate']} />}>
          <Route path="/jobs" element={<Jobs />} />
        </Route>

        {/* HR Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/candidates" element={<Candidates />} />
        </Route>

        {/* Candidate Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
          <Route path="/welcome" element={<Navigate to="/candidate-dashboard" replace />} />
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/apply/:jobId" element={<ApplyJob />} />
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
