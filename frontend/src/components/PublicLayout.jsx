import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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

function PublicLayout({ children }) {
  const auth = useAuth();
  const navigate = useNavigate();

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
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Brand />
          <div className="topnav-links">
            <NavLink to="/companies">Companies</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <div className="topnav-cta">
              {auth ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
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

      <main>{children}</main>

      <footer className="site-footer">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
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
            <div>
              <h4>Product</h4>
              <Link to="/companies">Browse companies</Link>
              {!auth && <Link to="/register">Sign up</Link>}
              <Link to="/company/register">List your company</Link>
            </div>
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
    </>
  );
}

export default PublicLayout;
