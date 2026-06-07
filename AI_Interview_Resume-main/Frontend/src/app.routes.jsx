import { createBrowserRouter, Navigate } from "react-router";
import Landing from "./features/landing/Landing.jsx";
import Login from "./features/auth/pages/Login.jsx";
import Register from "./features/auth/pages/Register.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./features/interview/pages/Dashboard.jsx";
import NewAnalysis from "./features/interview/pages/NewAnalysis.jsx";
import ReportView from "./features/interview/pages/ReportView.jsx";
import AtsChecker from "./features/resume/pages/AtsChecker.jsx";
import ResumeBuilder from "./features/resume/pages/ResumeBuilder.jsx";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/analyze", element: <NewAnalysis /> },
          { path: "/reports/:id", element: <ReportView /> },
          { path: "/ats", element: <AtsChecker /> },
          { path: "/resume-builder", element: <ResumeBuilder /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
