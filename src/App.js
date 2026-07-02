import React from "react";
import "./App.css";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import AppDetail from "./pages/AppDetail";
import Tools from "./pages/Tools";
import CameraStandalone from "./pages/CameraStandalone";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Navigate to="/studio" replace />} />
      <Route path="/register" element={<Navigate to="/studio" replace />} />
      <Route path="/studio" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
      <Route path="/camera" element={<ProtectedRoute><CameraStandalone /></ProtectedRoute>} />
      <Route path="/camera-ai" element={<ProtectedRoute><Navigate to="/camera" replace /></ProtectedRoute>} />
      <Route path="/camera-ocr" element={<ProtectedRoute><Navigate to="/camera" replace /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/studio?tab=apps" replace /></ProtectedRoute>} />
      <Route path="/apps/new" element={<ProtectedRoute><Navigate to="/studio?tab=builder" replace /></ProtectedRoute>} />
      <Route path="/apps/:appId" element={<ProtectedRoute><AppDetail /></ProtectedRoute>} />
      <Route path="/case-law" element={<ProtectedRoute><Navigate to="/studio?tab=case-law" replace /></ProtectedRoute>} />
      <Route path="/drafting-tool" element={<ProtectedRoute><Navigate to="/studio?tab=drafting-tool" replace /></ProtectedRoute>} />
      <Route path="/brief-builder" element={<ProtectedRoute><Navigate to="/drafting-tool" replace /></ProtectedRoute>} />
      <Route path="/tools" element={<ProtectedRoute><Navigate to="/studio" replace /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
