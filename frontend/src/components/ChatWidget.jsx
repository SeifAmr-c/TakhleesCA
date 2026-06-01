import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../api/authState.js";
import { useTranslation, useLanguage } from "../i18n";
import { streamChatMessage } from "../api/chatbot.js";
import logo from "../assets/logo.png";
import "./ChatWidget.css";

const initials = (name) =>
  (name || "T").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* Map each requirement's stable English `type` to an icon. Falls back to a
   generic doc glyph if the backend ever adds a new requirement type. */
const REQ_ICON = {
  "ACID Number": "shield",
  "National ID / Passport": "user",
  "Proof Of Payment": "receipt",
  Delegation: "doc",
  "Shipping Document": "package",
};

/* One application requirement, rendered as a premium checklist row. */
function ReqCard({ req }) {
  return (
    <div className="tk-req">
      <span className="tk-req__icon">
        <Icon name={REQ_ICON[req.type] || "doc"} size={16} />
      </span>
      <div className="tk-req__info">
        <div className="tk-req__name">{req.name}</div>
        {req.description && <div className="tk-req__desc">{req.description}</div>}
      </div>
    </div>
  );
}

/* One recommended company, rendered as a tappable card with View/Apply. */
function RecCard({ rec }) {
  const { t } = useTranslation("client");
  const navigate = useNavigate();
  const rating = Number(rec.AverageRating);
  const hasRating = rec.AverageRating != null && rating > 0;
  return (
    <div className="tk-rec">
      {rec.LogoUrl ? (
        <img className="tk-rec__logo" src={rec.LogoUrl} alt="" />
      ) : (
        <span className="tk-rec__logo">{initials(rec.Name)}</span>
      )}
      <div className="tk-rec__info">
        <div className="tk-rec__name">{rec.Name}</div>
        <div className="tk-rec__meta">
          <span>{rec.CategoryType || "—"}</span>
          <span>·</span>
          <span className="tabular">{t("chat.card.currency")} <bdi>{Number(rec.CategoryPrice || 0).toLocaleString()}</bdi></span>
          {hasRating && (
            <>
              <span>·</span>
              <span className="row" style={{ gap: 2, alignItems: "center" }}>
                <Icon name="star" size={11} color="var(--safety)" filled />
                <bdi>{rating.toFixed(1)}</bdi>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="tk-rec__actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/companies/${rec.CompanyID}`)}>
          {t("chat.card.view")}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/applications/new/${rec.CompanyID}`)}>
          {t("chat.card.apply")}
        </button>
      </div>
    </div>
  );
}

/* sessionStorage key holding the login the user last consented under. We store
   the login's `expiresAt` (minted fresh on every login in authState.js) so the
   recording notice reappears once per login: a new login => new expiresAt =>
   stored value no longer matches => consent is required again. Page refreshes
   within the same login keep the value, so we don't re-nag on every navigation. */
const CONSENT_KEY = "takhlees_chat_consent";

function ChatWidget() {
  const auth = useAuth();
  const { t } = useTranslation("client");
  const { lang } = useLanguage();

  const isClient = auth?.kind === "user" && auth?.role === "client" && !!auth?.user?.UserID;
  const loginId = auth?.expiresAt ?? null;

  const [open, setOpen] = useState(false);
  /* Whether the recording notice has been accepted for the current login. */
  const [consented, setConsented] = useState(false);
  /* Whether the recording-notice dialog is currently shown. */
  const [showConsent, setShowConsent] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, recommendations? }
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  /* Autoscroll to newest content as tokens stream in. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, streaming, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  /* Abort any in-flight stream on unmount. */
  useEffect(() => () => abortRef.current?.abort(), []);

  /* Re-evaluate consent whenever the login changes (login / logout / re-login).
     If this login hasn't accepted the notice yet, force the panel closed so the
     dialog shows on the next launch. */
  useEffect(() => {
    let accepted = false;
    try {
      accepted = loginId != null && sessionStorage.getItem(CONSENT_KEY) === String(loginId);
    } catch {
      accepted = false;
    }
    setConsented(accepted);
    if (!accepted) {
      setOpen(false);
      setShowConsent(false);
    }
  }, [loginId]);

  /* Launcher click: open straight away if already consented this login,
     otherwise surface the recording notice first. */
  const onLaunch = useCallback(() => {
    if (consented) setOpen(true);
    else setShowConsent(true);
  }, [consented]);

  const acceptConsent = useCallback(() => {
    try {
      if (loginId != null) sessionStorage.setItem(CONSENT_KEY, String(loginId));
    } catch {
      /* sessionStorage unavailable (private mode) — proceed for this view only. */
    }
    setConsented(true);
    setShowConsent(false);
    setOpen(true);
  }, [loginId]);

  const rejectConsent = useCallback(() => {
    setShowConsent(false);
    setOpen(false);
  }, []);

  const send = useCallback(
    (text) => {
      const content = text.trim();
      if (!content || streaming) return;
      setError("");

      const history = [...messages, { role: "user", content }];
      /* Append the user turn plus an empty assistant turn we stream into. */
      setMessages([...history, { role: "assistant", content: "", recommendations: [], requirements: [] }]);
      setInput("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const wire = history.map((m) => ({ role: m.role, content: m.content }));

      streamChatMessage(wire, {
        lang,
        signal: controller.signal,
        onToken: (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + chunk };
            }
            return next;
          });
        },
        onDone: (data) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                recommendations: data.recommendations || [],
                requirements: data.requirements || [],
              };
            }
            return next;
          });
          setStreaming(false);
        },
        onError: (message) => {
          /* Drop the empty assistant placeholder and surface the error. */
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant" && !last.content) next.pop();
            return next;
          });
          setError(message || t("chat.error"));
          setStreaming(false);
        },
      });
    },
    [messages, streaming, lang, t]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!isClient) return null;

  const suggestions = [
    t("chat.suggestions.recommend"),
    t("chat.suggestions.documents"),
    t("chat.suggestions.howItWorks"),
  ];

  return (
    <>
      {!open && (
        <button type="button" dir="ltr" className="tk-chat-fab" onClick={onLaunch} aria-label={t("chat.launcher")}>
          <span className="tk-chat-fab__logo"><img src={logo} alt="" /></span>
          <span className="tk-chat-fab__label">{t("chat.launcher")}</span>
        </button>
      )}

      {showConsent && (
        <div className="tk-chat-consent" role="presentation" onClick={rejectConsent}>
          <div
            dir="auto"
            className="tk-chat-consent__card"
            role="dialog"
            aria-modal="true"
            aria-label={t("chat.consent.title")}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="tk-chat-consent__icon"><Icon name="shield" size={22} /></span>
            <div className="tk-chat-consent__title">{t("chat.consent.title")}</div>
            <p className="tk-chat-consent__body">{t("chat.consent.body")}</p>
            <div className="tk-chat-consent__actions">
              <button type="button" className="btn btn-secondary" onClick={rejectConsent}>
                {t("chat.consent.reject")}
              </button>
              <button type="button" className="btn btn-primary" onClick={acceptConsent}>
                {t("chat.consent.accept")}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div dir="ltr" className="tk-chat-panel" role="dialog" aria-label={t("chat.title")}>
          <div className="tk-chat-header">
            <span className="tk-chat-header__avatar"><img src={logo} alt="" /></span>
            <div>
              <div className="tk-chat-header__title">{t("chat.title")}</div>
              <div className="tk-chat-header__subtitle">{t("chat.subtitle")}</div>
            </div>
            <button type="button" className="tk-chat-header__close" onClick={() => setOpen(false)} aria-label={t("chat.close")}>
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="tk-chat-body" ref={bodyRef}>
            {/* Greeting + starter prompts (only before the first turn) */}
            {messages.length === 0 && (
              <div className="tk-chat-msg tk-chat-msg--assistant">
                <div dir="auto" className="tk-chat-bubble">{t("chat.greeting")}</div>
                <div className="tk-chat-suggestions">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="tk-chat-suggestion" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isAssistant = m.role === "assistant";
              const isLast = i === messages.length - 1;
              const showTyping = isAssistant && isLast && streaming && !m.content;
              return (
                <div key={i} className={`tk-chat-msg ${isAssistant ? "tk-chat-msg--assistant" : "tk-chat-msg--user"}`}>
                  {showTyping ? (
                    <div className="tk-chat-bubble">
                      <span className="tk-chat-typing"><span /><span /><span /></span>
                    </div>
                  ) : (
                    m.content && <div dir="auto" className="tk-chat-bubble">{m.content}</div>
                  )}
                  {isAssistant && m.requirements?.length > 0 && (
                    <div className="tk-chat-reqs">
                      <div className="tk-chat-reqs__title">
                        <Icon name="check" size={13} />
                        {t("chat.requirements.title")}
                      </div>
                      {m.requirements.map((req, ri) => (
                        <ReqCard key={req.type || ri} req={req} />
                      ))}
                    </div>
                  )}
                  {isAssistant && m.recommendations?.length > 0 && (
                    <div className="tk-chat-recs">
                      {m.recommendations.map((rec) => (
                        <RecCard key={rec.CompanyID} rec={rec} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && <div className="tk-chat-error">{error}</div>}

          <form className="tk-chat-footer" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              className="tk-chat-input"
              rows={1}
              placeholder={t("chat.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
            />
            <button type="submit" className="tk-chat-send" disabled={!input.trim() || streaming} aria-label={t("chat.send")}>
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
