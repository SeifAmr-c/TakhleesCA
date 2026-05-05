import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./api/authState.js";

import LandingPage from "./pages/public/LandingPage.jsx";
import AboutUs from "./pages/public/AboutUs.jsx";
import ContactUs from "./pages/public/ContactUs.jsx";
import BrowseCompanies from "./pages/public/BrowseCompanies.jsx";

import UserLogin from "./pages/auth/UserLogin.jsx";
import UserRegister from "./pages/auth/UserRegister.jsx";
import CompanyLogin from "./pages/auth/CompanyLogin.jsx";
import CompanyRegister from "./pages/auth/CompanyRegister.jsx";

import CompanyDetails from "./pages/client/CompanyDetails.jsx";
import FillApplication from "./pages/client/FillApplication.jsx";
import PaymentPage from "./pages/client/PaymentPage.jsx";
import Tracking from "./pages/client/Tracking.jsx";
import UserProfileEdit from "./pages/client/UserProfileEdit.jsx";

import CompanyDashboard from "./pages/company/CompanyDashboard.jsx";
import CompanyProfileEdit from "./pages/company/CompanyProfileEdit.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";

function RequireAuth({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/companies" element={<BrowseCompanies />} />

        {/* Auth */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />
        <Route path="/company/login" element={<CompanyLogin />} />
        <Route path="/company/register" element={<CompanyRegister />} />

        {/* Client */}
        <Route path="/companies/:companyId" element={<CompanyDetails />} />
        <Route path="/applications/new" element={<RequireAuth><FillApplication /></RequireAuth>} />
        <Route path="/applications/new/:companyId" element={<RequireAuth><FillApplication /></RequireAuth>} />
        <Route path="/payment/:applicationId" element={<PaymentPage />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/user/profile" element={<RequireAuth><UserProfileEdit /></RequireAuth>} />

        {/* Company / Admin */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/profile" element={<CompanyProfileEdit />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
