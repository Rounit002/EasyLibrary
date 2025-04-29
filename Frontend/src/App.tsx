import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ActiveStudents from './pages/ActiveStudents';
import AllStudents from './pages/AllStudents';
import ExpiringMembershipsPage from './pages/ExpiringMembershipsPage';
import ExpiredMemberships from './pages/ExpiredMemberships';
import StudentDetails from './pages/StudentDetails';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import AdminRoute from './components/AdminRoute';
import AddUserForm from './components/AddUserForm';
import AddStudentForm from './components/AddStudentForm';
import ShiftList from './pages/ShiftList';
import ShiftStudents from './pages/ShiftStudents';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><AllStudents /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute><AddStudentForm /></ProtectedRoute>} />
      <Route path="/active-students" element={<ProtectedRoute><ActiveStudents /></ProtectedRoute>} />
      <Route path="/expired-memberships" element={<ProtectedRoute><ExpiredMemberships /></ProtectedRoute>} />
      <Route path="/expiring-memberships" element={<ProtectedRoute><ExpiringMembershipsPage /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/shifts" element={<ProtectedRoute><ShiftList /></ProtectedRoute>} />
      <Route path="/shifts/:id/students" element={<ProtectedRoute><ShiftStudents /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/users/new" element={<AdminRoute><AddUserForm /></AdminRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
            <Toaster />
          </HashRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;