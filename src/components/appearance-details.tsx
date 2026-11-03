import type { Settings } from "@/lib/types";
import { MediaInput } from "./media-input";
import { SocialCardsEditor } from "./social-cards-editor";
export function AppearanceDetails({
  portalId,
  settings: s,
}: {
  portalId: string;
  settings: Settings;
}) {
  return (
    <>
      <section className="panel">
        <h2>Cores e assinatura visual</h2>
        <div className="form-columns">
          <label>
            Cor de destaque
            <input
              name="accentColor"
              type="color"
              defaultValue={s.accentColor || "#d5ff00"}
            />
          </label>
          <label>
            Fundo do portal
            <input
              name="surfaceColor"
              type="color"
              defaultValue={s.surfaceColor || "#ffffff"}
            />
          </label>
          <label>
            Cor dos textos
            <input
              name="textColor"
              type="color"
              defaultValue={s.textColor || "#21152e"}
            />
          </label>
        </div>
        <label>
          Assinatura abaixo da marca
          <input name="tagline" maxLength={160} defaultValue={s.tagline} />
        </label>
      </section>
      <section className="panel">
        <h2>WhatsApp e vídeos da capa</h2>
        <label>
          Link do grupo ou canal do WhatsApp
          <input
            name="whatsappUrl"
            placeholder="https://..."
            defaultValue={s.whatsappUrl}
          />
        </label>
        <label>
          Chamada do WhatsApp
          <input
            name="whatsappText"
            maxLength={200}
            defaultValue={s.whatsappText}
          />
        </label>
        <label>
          Vídeo em destaque (YouTube)
          <input
            name="videoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            defaultValue={s.videoUrl}
          />
        </label>
        <label>
          Título do vídeo
          <input
            name="videoTitle"
            maxLength={200}
            defaultValue={s.videoTitle}
          />
        </label>
        <label>
          Link de mais vídeos
          <input name="videosLink" defaultValue={s.videosLink} />
        </label>
      </section>
      <section className="panel">
        <h2>Blocos de redes sociais</h2>
        <SocialCardsEditor portalId={portalId} value={s.socialCards} />
      </section>
      <section className="panel">
        <h2>Contato, novidades e privacidade</h2>
        <label className="check-label">
          <input
            name="contactEnabled"
            type="checkbox"
            defaultChecked={s.contactEnabled ?? true}
          />
          Exibir formulário de contato
        </label>
        <label>
          Título do formulário
          <input
            name="contactTitle"
            maxLength={160}
            defaultValue={s.contactTitle}
          />
        </label>
        <label className="check-label">
          <input
            name="newsletterEnabled"
            type="checkbox"
            defaultChecked={s.newsletterEnabled ?? true}
          />
          Exibir inscrição para novidades
        </label>
        <label>
          Chamada de novidades por e-mail
          <input
            name="newsletterTitle"
            maxLength={160}
            defaultValue={s.newsletterTitle}
          />
        </label>
        <label>
          Chamada do canal no rodapé
          <input
            name="newsletterText"
            maxLength={300}
            defaultValue={s.newsletterText}
          />
        </label>
        <label>
          Link da política de privacidade
          <input
            name="privacyUrl"
            placeholder="/pagina/privacidade"
            defaultValue={s.privacyUrl}
          />
        </label>
        <p className="field-hint">
          Mensagens e inscrições ficam em Leitores e contato. O formulário
          registra dados reais e exige consentimento; não dispara campanhas de
          e-mail automaticamente.
        </p>
      </section>
      <section className="panel">
        <h2>Redação e contato comercial</h2>
        <div className="form-columns">
          <label>
            E-mail da redação
            <input
              name="contactEmail"
              type="email"
              defaultValue={s.contactEmail}
            />
          </label>
          <label>
            Telefone da redação
            <input
              name="contactPhone"
              maxLength={50}
              defaultValue={s.contactPhone}
            />
          </label>
          <label>
            E-mail comercial
            <input
              name="commercialEmail"
              type="email"
              defaultValue={s.commercialEmail}
            />
          </label>
          <label>
            Telefone comercial
            <input
              name="commercialPhone"
              maxLength={50}
              defaultValue={s.commercialPhone}
            />
          </label>
        </div>
        <label>
          Texto do bloco comercial
          <textarea
            name="commercialText"
            maxLength={300}
            defaultValue={s.commercialText}
          />
        </label>
      </section>
      <section className="panel">
        <h2>SEO e compartilhamento do portal</h2>
        <label>
          Título SEO da capa
          <input name="seoTitle" maxLength={70} defaultValue={s.seoTitle} />
        </label>
        <label>
          Descrição SEO da capa
          <textarea
            name="seoDescription"
            maxLength={180}
            defaultValue={s.seoDescription}
          />
        </label>
        <MediaInput
          portalId={portalId}
          name="ogImage"
          label="Imagem de compartilhamento"
          value={s.ogImage}
        />
      </section>
    </>
  );
}
