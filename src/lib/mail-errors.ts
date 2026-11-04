export function mailDeliveryMessage(code?: string, status?: number) {
  if (
    [
      "over_email_send_rate_limit",
      "over_request_rate_limit",
      "email_send_rate_limit",
      "too_many_requests",
    ].includes(code || "") ||
    status === 429
  )
    return "O limite de envio de e-mails foi atingido. Use Copiar convite para compartilhar o acesso; reenviar agora não resolve esse limite.";
  if (
    [
      "email_address_not_authorized",
      "email_provider_disabled",
      "smtp_admin_email_missing",
    ].includes(code || "")
  )
    return "O envio de e-mails precisa ser ativado pela administração da plataforma. Use Copiar convite para compartilhar o acesso.";
  return "O serviço de e-mail não aceitou o envio. O acesso do editor está salvo. Use Copiar convite ou fale com a administração.";
}
