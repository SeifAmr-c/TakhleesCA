import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api/auth.js";
import Icon from "./Icon.jsx";

function DashboardLayout({ title, subtitle, role, actions, children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Link to="/" className="topnav-brand">
            <span className="logo">
              <Icon name="anchor" size={18} />
            </span>
            <span>Takhlees</span>
            {role && (
              <span className="badge badge-dark" style={{ marginLeft: 6 }}>
                {role}
              </span>
            )}
          </Link>
          <div className="topnav-links">
            <Link to="/tracking" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="package" size={16} /> Shipments
            </Link>
            <Link to="/companies" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="building" size={16} /> Companies
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
              <Icon name="logout" size={16} /> Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="container" style={{ padding: "32px 24px 80px" }}>
        {(title || actions) && (
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 32,
            }}
          >
            <div>
              {title && <h1 className="h2" style={{ margin: 0 }}>{title}</h1>}
              {subtitle && <p className="muted" style={{ margin: "6px 0 0" }}>{subtitle}</p>}
            </div>
            {actions && <div className="row">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </>
  );
}

export default DashboardLayout;
