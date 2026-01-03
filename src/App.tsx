import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeeProfile from "./pages/employee/Profile";
import EmployeeAttendance from "./pages/employee/Attendance";
import EmployeeLeave from "./pages/employee/Leave";
import EmployeePayroll from "./pages/employee/Payroll";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEmployees from "./pages/admin/Employees";
import AdminAttendance from "./pages/admin/Attendance";
import AdminLeaveApprovals from "./pages/admin/LeaveApprovals";
import AdminPayroll from "./pages/admin/Payroll";
import AuditLogs from "./pages/admin/AuditLogs";
import Notifications from "./pages/Notifications";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading, isFirstLogin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (isFirstLogin) return <Navigate to="/change-password" replace />;
  
  // Ensure we have a role before redirecting
  // If role is null, default to employee dashboard (ProtectedRoute will handle redirect)
  const redirectPath = role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
  
  console.log('RootRedirect:', { role, redirectPath, user: user?.email });
  
  return <Navigate to={redirectPath} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            
            {/* Employee Routes */}
            <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/profile" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/employee/attendance" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeAttendance /></ProtectedRoute>} />
            <Route path="/employee/leave" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeLeave /></ProtectedRoute>} />
            <Route path="/employee/payroll" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePayroll /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={['admin']}><AdminEmployees /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/leave-approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminLeaveApprovals /></ProtectedRoute>} />
            <Route path="/admin/payroll" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayroll /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
