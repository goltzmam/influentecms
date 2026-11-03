"use client";
import { useActionState } from "react";
import { contactPortal, subscribePortal } from "@/app/public-actions";
import { safeLink } from "@/lib/links";
export function ContactForm({
  portalId,
  title,
  privacyUrl,
  preview = false,
}: {
  portalId: string;
  title: string;
  privacyUrl?: string;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(contactPortal, {
    ok: false,
    message: "",
  });
  return (
    <section className="reader-contact">
      <h2>{title}</h2>
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
          <div className="reader-fields">
            <label>
              Nome *
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              E-mail *
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <label className="full-field">
              Endereço
              <input
                name="address"
                autoComplete="street-address"
                maxLength={300}
              />
            </label>
            <label>
              Bairro
              <input name="neighborhood" maxLength={100} />
            </label>
            <label>
              Telefone (com DDD)
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={50}
              />
            </label>
            <label className="full-field">
              Assunto *<input name="subject" required maxLength={160} />
            </label>
            <label className="full-field">
              Tipo de manifestação *
              <select aria-label="Tipo de manifestação" name="kind">
                <option>Sugestão</option>
                <option>Elogio</option>
                <option>Crítica</option>
                <option>Outro</option>
              </select>
            </label>
            <label className="full-field">
              Sua mensagem *
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={5000}
                placeholder="Descreva sua sugestão, elogio, crítica ou outro assunto."
              />
            </label>
          </div>
          <label className="reader-consent">
            <input type="checkbox" name="consent" required />
            Autorizo o uso destes dados para responder minha mensagem.
          </label>
          {privacyUrl && (
            <a className="privacy-link" href={safeLink(privacyUrl)}>
              Política de privacidade
            </a>
          )}
          <button type="submit">
            {pending ? "Enviando…" : "Enviar mensagem"}
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
    </section>
  );
}
export function NewsletterForm({
  portalId,
  title,
  preview = false,
}: {
  portalId: string;
  title: string;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(subscribePortal, {
    ok: false,
    message: "",
  });
  return (
    <div className="newsletter-signup">
      <h2>{title}</h2>
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
              placeholder="Seu e-mail"
              required
              maxLength={254}
            />
            <button>{pending ? "Registrando…" : "Assinar"}</button>
          </div>
          <label className="reader-consent">
            <input type="checkbox" name="consent" required />
            Quero receber novidades por e-mail.
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
