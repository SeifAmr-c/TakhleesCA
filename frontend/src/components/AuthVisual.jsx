import React from "react";
import Icon from "./Icon.jsx";
import styles from "../pages/auth/Auth.module.css";

function AuthVisual({
  heading = "Port clearance, finally without the friction.",
  lead = "Takhlees connects importers with verified clearance specialists. Submit, track, and pay — all in one place.",
  quote = "We cut our average clearance time in half. One dashboard replaced twelve phone calls a day.",
  person = "Karim Hassan",
  meta = "Ops Lead, Nile Imports",
  initials = "KH",
}) {
  return (
    <aside className={styles.visualSide}>
      <div>
        <span className="badge badge-glass">
          <Icon name="anchor" size={14} /> Takhlees · Egypt
        </span>
        <h2 className={styles.visualHeading}>{heading}</h2>
        <p className={styles.visualLead}>{lead}</p>

        <div className={styles.visualCard}>
          <p className={styles.visualQuote}>“{quote}”</p>
          <div className={styles.visualPersona}>
            <div className="avatar">{initials}</div>
            <div>
              <div className={styles.visualPerson}>{person}</div>
              <div className={styles.visualMeta}>{meta}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.visualFooter}>
        <div className="row" style={{ gap: 18, color: "rgba(255,255,255,0.5)" }}>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="shield" size={14} /> SOC2 path
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="lock" size={14} /> bcrypt + sessions
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="check" size={14} /> KYB verified
          </span>
        </div>
      </div>
    </aside>
  );
}

export default AuthVisual;
