import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import logo from "../assets/logo.png";
import { useAuth, clearAuth } from "../api/authState.js";
import { logout as apiLogout } from "../api/auth.js";
import { logoutCompany as apiLogoutCompany } from "../api/companies.js";

function Brand() {
  return (
    <Link to="/" className="topnav-brand" aria-label="Takhlees, home">
      <span className="logo-mark">
        <img src={logo} alt="" />
      </span>
      <span>Takhlees</span>
    </Link>
  );
}

function PublicLayout({ children, title, subtitle, actions, role: _role }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasHeader = Boolean(title || subtitle || actions);

  const isCompany = auth?.role === "company";
  const isAdmin = auth?.role === "admin";
  const isUser = auth?.kind === "user" && !isAdmin;
  const companyName = auth?.company?.Name;
  const userFirstName = auth?.user?.FirstName;
  const greetingName = isCompany
    ? companyName
    : isAdmin
      ? userFirstName
      : isUser
        ? userFirstName
        : null;
  const profileActive = location.pathname.startsWith("/user/profile");
  const adminProfileActive = location.pathname.startsWith("/admin/profile");

  /* Admin nav links deep-link into the management page's hash-driven
     tab system. `replace: false` so each click is a real history entry
     and the back button takes the admin back to where they were. */
  const goToAdminTab = (hash) => (e) => {
    e.preventDefault();
    navigate(`/admin/management#${hash}`, { replace: false });
  };

  const handleLogout = async () => {
    try {
      if (auth?.kind === "company") {
        await apiLogoutCompany();
      } else {
        await apiLogout();
      }
    } catch {
      /* server-side cookie may already be gone — keep going */
    } finally {
      clearAuth();
      navigate("/", { replace: true });
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="topnav">
        <div className="container topnav-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Brand />
            {greetingName && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink-soft)",
                  whiteSpace: "nowrap",
                }}
              >
                Hello <strong style={{ fontWeight: 700, color: "var(--ink)" }}>{greetingName}</strong>
              </span>
            )}
          </div>
          <div className="topnav-links">
            {isAdmin ? (
              <>
                <NavLink to="/admin/dashboard" end>Dashboard</NavLink>
                <a href="/admin/management#companies" onClick={goToAdminTab("companies")}>
                  Companies
                </a>
                <a href="/admin/management#support" onClick={goToAdminTab("support")}>
                  Support
                </a>
                <a href="/admin/management#users" onClick={goToAdminTab("users")}>
                  Users
                </a>
                <a href="/admin/management#users/commissions" onClick={goToAdminTab("users/commissions")}>
                  Commissions
                </a>
              </>
            ) : isCompany ? (
              <>
                <NavLink to="/company/dashboard">Dashboard</NavLink>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/contact">Contact</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/companies">Companies</NavLink>
                {isUser && <NavLink to="/tracking">Shipments</NavLink>}
                {isUser && <NavLink to="/recommend">Find a Company</NavLink>}
                <NavLink to="/about">About</NavLink>
                <NavLink to="/contact">Contact</NavLink>
              </>
            )}
            <div className="topnav-cta">
              {auth ? (
                <>
                  {isUser && (
                    <button
                      type="button"
                      onClick={() => navigate("/user/profile")}
                      aria-label="User profile"
                      title="User profile"
                      className={profileActive ? "active" : ""}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "1px solid var(--line)",
                        color: profileActive ? "var(--ink)" : "var(--ink-soft)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <Icon name="user" size={16} />
                    </button>
                  )}
                  {isAdmin && (
                    <NavLink
                      to="/admin/profile"
                      aria-label="Admin profile"
                      title="Admin profile"
                      className={({ isActive }) => isActive ? "active" : ""}
                      style={({ isActive }) => ({
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "1px solid var(--line)",
                        color: isActive || adminProfileActive ? "var(--ink)" : "var(--ink-soft)",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "none",
                      })}
                    >
                      <Icon name="user" size={16} />
                    </NavLink>
                  )}
                  {isCompany && (
                    <NavLink
                      to="/company/profile"
                      aria-label="Company profile"
                      title="Company profile"
                      className={({ isActive }) => isActive ? "active" : ""}
                      style={({ isActive }) => ({
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: auth?.company?.LogoUrl ? "transparent" : "var(--surface-2, #f8fafc)",
                        backgroundImage: auth?.company?.LogoUrl ? `url(${auth.company.LogoUrl})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid var(--line)",
                        color: isActive ? "var(--ink)" : "var(--ink-soft)",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "none",
                        overflow: "hidden",
                        fontSize: 12,
                        fontWeight: 700,
                      })}
                    >
                      {!auth?.company?.LogoUrl && (
                        (auth?.company?.Name || "")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase() || <Icon name="user" size={16} />
                      )}
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 6 }}
                  >
                    <Icon name="logout" size={14} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
                  <Link to="/register" className="btn btn-secondary btn-sm">
                    Get started
                    <Icon name="arrow_right" size={14} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {hasHeader ? (
          <div className="container" style={{ padding: "32px 24px 80px" }}>
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
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          {!isAdmin && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompany
                    ? "1.4fr 1fr 1fr"
                    : "1.4fr 1fr 1fr 1fr",
                  gap: 32,
                }}
              >
                <div>
                  <p
                    style={{
                      color: "oklch(100% 0 0 / 0.6)",
                      fontSize: 14,
                      maxWidth: 320,
                      lineHeight: 1.6,
                    }}
                  >
                    Instrumented port clearance for Egyptian importers and exporters.
                    Verified agencies, escrowed payments, live status from gate-in to release.
                  </p>
                </div>
                {!isCompany && (
                  <div>
                    <h4>Product</h4>
                    <Link to="/companies">Browse companies</Link>
                    {!auth && <Link to="/register">Sign up</Link>}
                    <Link to="/company/register">List your company</Link>
                  </div>
                )}
                <div>
                  <h4>Company</h4>
                  <Link to="/about">About us</Link>
                  <Link to="/contact">Contact</Link>
                  {auth ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        background: "none",
                        border: 0,
                        padding: 0,
                        margin: 0,
                        cursor: "pointer",
                        font: "inherit",
                        color: "inherit",
                        textAlign: "left",
                      }}
                    >
                      Logout
                    </button>
                  ) : (
                    <Link to="/company/login">Company login</Link>
                  )}
                </div>
                <div>
                  <h4>Legal</h4>
                  <Link to="/legal/privacy">Privacy</Link>
                  <Link to="/legal/terms">Terms</Link>
                </div>
              </div>
              <hr
                style={{
                  border: 0,
                  borderTop: "1px solid oklch(100% 0 0 / 0.08)",
                  margin: "40px 0 20px",
                }}
              />
            </>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              color: "oklch(100% 0 0 / 0.5)",
            }}
          >
            <span>
              &copy; {new Date().getFullYear()} TAKHLEES · ALL RIGHTS RESERVED
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
