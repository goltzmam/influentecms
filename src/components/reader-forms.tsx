"use client";
import type { Experience } from "@/lib/experience";
import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";
import { contactPortal, subscribePortal } from "@/app/public-actions";
import { safeLink } from "@/lib/links";
export function ContactForm({
  portalId,
  title,
  privacyUrl,
  preview = false,
  config,
}: {
  portalId: string;
  title: string;
  privacyUrl?: string;
  config?: Experience["contact"];
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(contactPortal, {
    ok: false,
    message: "",
  });
  const mode = config?.mode || "compact";
  const optional = config?.fields || ["phone", "subject"];
  if (mode === "hidden") return null;
  const field = (key: string) => optional.includes(key as never);
  const body = (
    <>
      <p className="contact-intro">
        {config?.intro || "Envie sua mensagem. Nossa equipe está por aqui."}
      </p>
      <form action={action}>
        <input type="hidden" name="portal_id" value={portalId} />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="form-trap"
          aria-hidden="true"
        />
        {(["address", "neighborhood", "phone", "subject", "kind"] as const)
          .filter((key) => !field(key))
          .map((key) => (
            <input
              key={key}
              type="hidden"
              name={key}
              value={
                key === "subject"
                  ? "Contato pelo portal"
                  : key === "kind"
                    ? "Outro"
                    : ""
              }
            />
          ))}
        <fieldset disabled={preview || pending}>
          <div className="reader-fields">
            <label>
              {config?.nameLabel || "Nome"} *
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              {config?.emailLabel || "E-mail"} *
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            {field("address") && (
              <label className="full-field">
                Endereço
                <input
                  name="address"
                  autoComplete="street-address"
                  maxLength={300}
                />
              </label>
            )}
            {field("neighborhood") && (
              <label>
                Bairro
                <input name="neighborhood" maxLength={100} />
              </label>
            )}
            {field("phone") && (
              <label>
                {config?.phoneLabel || "Telefone (com DDD)"}
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={50}
                />
              </label>
            )}
            {field("subject") && (
              <label className="full-field">
                {config?.subjectLabel || "Assunto"} *
                <input name="subject" required maxLength={160} />
              </label>
            )}
            {field("kind") && (
              <label className="full-field">
                Tipo de manifestação *
                <select aria-label="Tipo de manifestação" name="kind">
                  <option>Sugestão</option>
                  <option>Elogio</option>
                  <option>Crítica</option>
                  <option>Outro</option>
                </select>
              </label>
            )}
            <label className="full-field">
              {config?.messageLabel || "Sua mensagem"} *
              <textarea
                rows={config?.messageRows || 3}
                name="message"
                required
                minLength={10}
                maxLength={5000}
                placeholder={
                  config?.messagePlaceholder || "Como podemos ajudar?"
                }
              />
            </label>
          </div>
          <label className="reader-consent">
            <input type="checkbox" name="consent" required />
            {config?.consentText ||
              "Autorizo o uso destes dados para responder minha mensagem."}
          </label>
          {privacyUrl && (
            <a className="privacy-link" href={safeLink(privacyUrl)}>
              Política de privacidade
            </a>
          )}
          <button type="submit">
            {pending ? "Enviando…" : config?.buttonLabel || "Enviar mensagem"}
          </button>
        </fieldset>
        {state.message && (
          <p
            role="status"
            className={`reader-result ${state.ok ? "success" : "failure"}`}
          >
            {state.message}
          </p>
        )}
      </form>
    </>
  );
  return (
    <section
      data-edit-region="contact"
      className={`reader-contact contact-${mode} contact-columns-${config?.columns || "two"}`}
      style={
        {
          maxWidth: config?.maxWidth || 640,
          backgroundColor: config?.background,
          color: config?.color,
          borderRadius: config?.radius ?? 16,
          padding: config?.padding ?? 24,
          "--contact-button": config?.buttonColor,
        } as React.CSSProperties
      }
    >
      {mode === "inline" ? (
        <>
          <h2>{title}</h2>
          {body}
        </>
      ) : (
        <details className="contact-expander">
          <summary>
            <span>
              <strong>{title}</strong>
              <small>{config?.intro || "Escreva para a nossa equipe"}</small>
            </span>
            <span aria-hidden="true">
              <ArrowUpRight size={20} />
            </span>
          </summary>
          <div className="contact-expanded">{body}</div>
        </details>
      )}
    </section>
  );
}
export function NewsletterForm({
  config,
  portalId,
  title,
  preview = false,
}: {
  config?: Experience["newsletter"];
  portalId: string;
  title: string;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(subscribePortal, {
    ok: false,
    message: "",
  });
  return (
    <div
      className="newsletter-signup"
      style={
        {
          "--newsletter-button-bg": config?.buttonColor,
          "--newsletter-button-color": config?.buttonTextColor,
          "--newsletter-input-bg": config?.inputBackground,
          "--newsletter-input-color": config?.inputColor,
        } as React.CSSProperties
      }
    >
      {title && <h2>{title}</h2>}
      {config?.description && (
        <p className="newsletter-description">{config.description}</p>
      )}
      <form action={action}>
        <input type="hidden" name="portal_id" value={portalId} />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="form-trap"
          aria-hidden="true"
        />
        <fieldset disabled={preview || pending}>
          <div className="newsletter-input">
            <input
              aria-label="E-mail para novidades"
              type="email"
              name="email"
              placeholder={config?.placeholder ?? "Seu e-mail"}
              required
              maxLength={254}
            />
            <button>
              {pending ? "Registrando…" : (config?.buttonLabel ?? "Assinar")}
            </button>
          </div>
          <label className="reader-consent">
            <input type="checkbox" name="consent" required />
            {config?.consentText ?? "Quero receber novidades por e-mail."}
          </label>
        </fieldset>
        {state.message && (
          <p role="status" className="reader-result">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
