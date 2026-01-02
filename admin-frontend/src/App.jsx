import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminDashboard from "./components/AdminDashboard";
import Login from "./pages/Login";
import "./App.css";

function AccessDenied() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access denied</h1>
        <p className="text-sm text-slate-600 mb-4">
          This account does not have admin privileges.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <AccessDenied />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
