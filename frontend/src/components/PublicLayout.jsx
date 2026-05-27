import React, { useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Trans } from "react-i18next";
import Icon from "./Icon.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import logo from "../assets/logo.png";
import { useAuth, clearAuth } from "../api/authState.js";
import { logout as apiLogout } from "../api/auth.js";
import { logoutCompany as apiLogoutCompany } from "../api/companies.js";
import { useTranslation, useLanguage } from "../i18n";

function Brand() {
  const { t } = useTranslation("common");
  return (
    <Link to="/" className="topnav-brand" aria-label={t("brand.homeAria")}>
      <span className="logo-mark">
        <img src={logo} alt="" />
      </span>
      <span>{t("brand.name")}</span>
    </Link>
  );
}

function PublicLayout({ children, title, subtitle, actions, role: _role }) {
  const { t } = useTranslation("common");
  const { lang, setLang } = useLanguage();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasHeader = Boolean(title || subtitle || actions);

  const isCompany = auth?.role === "company";
  const isAdmin = auth?.role === "admin";
  const isUser = auth?.kind === "user" && !isAdmin;

  /* The admin console is English-only — it has no Arabic translations and
     must stay LTR. If a previous client session left the persisted language
     as Arabic, snap it back to English while an admin is signed in. */
  useEffect(() => {
    if (isAdmin && lang !== "en") setLang("en");
  }, [isAdmin, lang, setLang]);
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
                <Trans
                  i18nKey="layout.greeting"
                  ns="common"
                  values={{ name: greetingName }}
                  components={{
                    strong: <strong style={{ fontWeight: 700, color: "var(--ink)" }} />,
                  }}
                />
              </span>
            )}
          </div>
          <div className="topnav-links">
            {isAdmin ? (
              <>
                <NavLink to="/admin/dashboard" end>{t("nav.dashboard")}</NavLink>
                <a href="/admin/management#companies" onClick={goToAdminTab("companies")}>
                  {t("nav.companies")}
                </a>
                <a href="/admin/management#support" onClick={goToAdminTab("support")}>
                  {t("nav.support")}
                </a>
                <a href="/admin/management#users" onClick={goToAdminTab("users")}>
                  {t("nav.users")}
                </a>
                <a href="/admin/management#users/commissions" onClick={goToAdminTab("users/commissions")}>
                  {t("nav.commissions")}
                </a>
              </>
            ) : isCompany ? (
              <>
                <NavLink to="/company/dashboard">{t("nav.dashboard")}</NavLink>
                <NavLink to="/about">{t("nav.about")}</NavLink>
                <NavLink to="/contact">{t("nav.contact")}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/companies">{t("nav.companies")}</NavLink>
                {isUser && <NavLink to="/tracking">{t("nav.shipments")}</NavLink>}
                {isUser && <NavLink to="/recommend">{t("nav.recommend")}</NavLink>}
                <NavLink to="/about">{t("nav.about")}</NavLink>
                <NavLink to="/contact">{t("nav.contact")}</NavLink>
              </>
            )}
            <div className="topnav-cta">
              {!isAdmin && <LanguageSwitcher />}
              {auth ? (
                <>
                  {isUser && (
                    <button
                      type="button"
                      onClick={() => navigate("/user/profile")}
                      aria-label={t("profile.userAria")}
                      title={t("profile.userAria")}
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
                      aria-label={t("profile.adminAria")}
                      title={t("profile.adminAria")}
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
                      aria-label={t("profile.companyAria")}
                      title={t("profile.companyAria")}
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
                    {t("auth.signOut")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary btn-sm">{t("auth.signIn")}</Link>
                  <Link to="/register" className="btn btn-secondary btn-sm">
                    {t("auth.getStarted")}
                    <Icon name="arrow_right" size={14} className="icon-flip" />
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
                    {t("footer.tagline")}
                  </p>
                </div>
                {!isCompany && (
                  <div>
                    <h4>{t("footer.product")}</h4>
                    <Link to="/companies">{t("footer.browseCompanies")}</Link>
                    {!auth && <Link to="/register">{t("auth.signUp")}</Link>}
                    <Link to="/company/register">{t("footer.listCompany")}</Link>
                  </div>
                )}
                <div>
                  <h4>{t("footer.company")}</h4>
                  <Link to="/about">{t("footer.aboutUs")}</Link>
                  <Link to="/contact">{t("footer.contact")}</Link>
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
                        textAlign: "start",
                      }}
                    >
                      {t("auth.logout")}
                    </button>
                  ) : (
                    <Link to="/company/login">{t("auth.companyLogin")}</Link>
                  )}
                </div>
                <div>
                  <h4>{t("footer.legal")}</h4>
                  <Link to="/legal/privacy">{t("footer.privacy")}</Link>
                  <Link to="/legal/terms">{t("footer.terms")}</Link>
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
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
