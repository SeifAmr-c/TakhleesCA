import React from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon.jsx";

function Brand() {
  return (
    <Link to="/" className="topnav-brand">
      <span className="logo">
        <Icon name="anchor" size={18} />
      </span>
      <span>Takhlees</span>
    </Link>
  );
}

function PublicLayout({ children }) {
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
              <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get started
                <Icon name="arrow_right" size={16} />
              </Link>
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
              <Brand />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 12, maxWidth: 280, lineHeight: 1.6 }}>
                Port clearance and logistics, simplified. Connecting importers
                with verified clearance specialists.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <Link to="/companies">Browse companies</Link>
              <Link to="/register">Sign up</Link>
              <Link to="/company/register">List your company</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link to="/about">About us</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/company/login">Company login</Link>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid rgba(255,255,255,0.08)", margin: "32px 0 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            <span>&copy; {new Date().getFullYear()} Takhlees. All rights reserved.</span>
            <span>Built for the Egyptian logistics industry · Made in Cairo</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default PublicLayout;
