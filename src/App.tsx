import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { BlockingPopupMessage } from "@/components/popup/BlockingPopupMessage";
import { DynamicHead } from "@/components/DynamicHead";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminWallet from "./pages/admin/AdminWallet";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminKYC from "./pages/admin/AdminKYC";
import AdminChat from "./pages/admin/AdminChat";
import AdminIPLogs from "./pages/admin/AdminIPLogs";
import AdminCryptoPayments from "./pages/admin/AdminCryptoPayments";
import AdminWorkspace from "./pages/admin/AdminWorkspace";
import AdminPostpaid from "./pages/admin/AdminPostpaid";
import AdminHealthCheck from "./pages/admin/AdminHealthCheck";

// User Pages
import UserDashboard from "./pages/user/UserDashboard";
import UserProducts from "./pages/user/UserProducts";
import UserOrders from "./pages/user/UserOrders";
import UserStorefront from "./pages/user/UserStorefront";
import UserPayments from "./pages/user/UserPayments";
import UserKYC from "./pages/user/UserKYC";
import UserSupport from "./pages/user/UserSupport";
import UserProfile from "./pages/user/UserProfile";
import UserChat from "./pages/user/UserChat";
import UserAI from "./pages/user/UserAI";
import UserHelp from "./pages/user/UserHelp";
import UserWorkspace from "./pages/user/UserWorkspace";


// Storefront
import Storefront from "./pages/storefront/Storefront";
import ProductPage from "./pages/storefront/ProductPage";

// Track Order
import TrackOrder from "./pages/TrackOrder";
import TrackOrderPublic from "./pages/TrackOrderPublic";

// Setup
import Setup from "./pages/Setup";
import SelfHostSetup from "./pages/SelfHostSetup";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: ('admin' | 'user')[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading, refreshUser } = useAuth();
  const location = useLocation();

  // If an admin deletes this account while it still has a live browser session,
  // refresh the profile on navigation to immediately revoke dashboard access.
  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshUser();
  }, [isAuthenticated, location.pathname, refreshUser]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> : <Index />} />
      <Route path="/auth" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> : <Auth />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      
      {/* Storefront (Public) */}
      <Route path="/store/:slug" element={<Storefront />} />
      <Route path="/store/:slug/product/:productId" element={<ProductPage />} />
      
      {/* Track Order (Public) */}
      <Route path="/track-order" element={<TrackOrder />} />
      <Route path="/track" element={<TrackOrderPublic />} />
      
      {/* Setup (Public - One Time) */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/self-host-setup" element={<ProtectedRoute allowedRoles={['admin']}><SelfHostSetup /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/wallet" element={<ProtectedRoute allowedRoles={['admin']}><AdminWallet /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayouts /></ProtectedRoute>} />
      <Route path="/admin/kyc" element={<ProtectedRoute allowedRoles={['admin']}><AdminKYC /></ProtectedRoute>} />
      <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={['admin']}><AdminChat /></ProtectedRoute>} />
      <Route path="/admin/ip-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminIPLogs /></ProtectedRoute>} />
      <Route path="/admin/crypto-payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminCryptoPayments /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/workspace" element={<ProtectedRoute allowedRoles={['admin']}><AdminWorkspace /></ProtectedRoute>} />
      <Route path="/admin/postpaid" element={<ProtectedRoute allowedRoles={['admin']}><AdminPostpaid /></ProtectedRoute>} />
      <Route path="/admin/health-check" element={<ProtectedRoute allowedRoles={['admin']}><AdminHealthCheck /></ProtectedRoute>} />
      
      {/* User Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={['user']}><UserProducts /></ProtectedRoute>} />
      <Route path="/dashboard/orders" element={<ProtectedRoute allowedRoles={['user']}><UserOrders /></ProtectedRoute>} />
      <Route path="/dashboard/storefront" element={<ProtectedRoute allowedRoles={['user']}><UserStorefront /></ProtectedRoute>} />
      <Route path="/dashboard/payments" element={<ProtectedRoute allowedRoles={['user']}><UserPayments /></ProtectedRoute>} />
      <Route path="/dashboard/kyc" element={<ProtectedRoute allowedRoles={['user']}><UserKYC /></ProtectedRoute>} />
      <Route path="/dashboard/support" element={<ProtectedRoute allowedRoles={['user']}><UserSupport /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute allowedRoles={['user']}><UserProfile /></ProtectedRoute>} />
      <Route path="/dashboard/chat" element={<ProtectedRoute allowedRoles={['user']}><UserChat /></ProtectedRoute>} />
      <Route path="/dashboard/ai" element={<ProtectedRoute allowedRoles={['user']}><UserAI /></ProtectedRoute>} />
      <Route path="/dashboard/help" element={<ProtectedRoute allowedRoles={['user','admin']}><UserHelp /></ProtectedRoute>} />
      <Route path="/dashboard/workspace" element={<ProtectedRoute allowedRoles={['user']}><UserWorkspace /></ProtectedRoute>} />
      
      
      {/* Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="trading" enableSystem={false} themes={['light', 'dark', 'trading', 'blue', 'green', 'purple', 'custom']}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DynamicHead />
            <BlockingPopupMessage />
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
