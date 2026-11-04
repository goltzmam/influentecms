# Validação — 3 de novembro de 2026

## Executado nesta máquina

- Instalação limpa com `npm ci` e lockfile final: aprovada.
- Build de produção Next.js, incluindo TypeScript: aprovado.
- Auditoria de dependências: nenhuma vulnerabilidade reportada.
- 14 testes de segurança, migrations e API: aprovados, nenhum ignorado. As verificações de API utilizaram Supabase local real; os testes de políticas isoladas utilizaram PostgreSQL embarcado PGlite.
- Fluxo completo no Chromium contra Auth/PostgreSQL/Storage reais: aprovado. Exercitou login e proteção de rotas, criação de portal e categoria, TipTap, upload/otimização de imagem, publicação, busca, editoria, feeds XML, homepage, troca de template, campanhas, parceiros, página institucional, agendamento, prévia privada, edição, exclusão, responsividade e logout.
- Bootstrap administrativo real: criação de proprietário e organização, login e rollback de uma segunda tentativa de provisionamento aprovados.
- Auth, REST e Storage responderam aos checks reais; cadastro público confirmado como desativado.
- Servidor final em execução; painel redireciona visitante sem sessão para o login.
- Usuários, organizações, portais, notícias e arquivos temporários dos testes foram removidos. Não há conteúdo demonstrativo no produto.

## UX de referência Influente News / Revista Influente

A estrutura dos dois templates foi adaptada ao PDF fornecido pelo proprietário, preservando os IDs internos dos templates e conteúdos existentes. A validação incluiu capturas desktop/mobile, carrossel numerado, vídeo lateral, publieditorial, mosaico de editoria, composição de revista, patrocinadores, anúncios em novas posições, cartões sociais, contato, novidades e rodapé. As capturas usam fixtures temporárias exclusivas dos testes; não há notícias ou anúncios demonstrativos persistidos no produto.

O segundo fluxo E2E verifica alteração de paleta, menus próprios reordenáveis, formulários persistidos no Supabase real, isolamento de mensagens entre portais e exportação CSV. O iframe externo YouTube usa uma resposta controlada somente no teste: a URL/embed foi verificada, sem alegar validação de reprodução no provedor externo. A terceira migration foi aplicada e os checks reais confirmam que visitantes não conseguem ler mensagens nem inscrições.

O `wget` dos health checks internos dos contêineres Auth/Storage ignora NO_PROXY neste ambiente e produz falso negativo via proxy. O diagnóstico foi confirmado com acesso direto ao endpoint de loopback dentro do contêiner. A inicialização utiliza a opção documentada `--ignore-health-check` neste caso, seguida obrigatoriamente pelos checks HTTP reais e pelos testes E2E. Não se tratou de ignorar falhas funcionais nem de desabilitar TLS.

## Requisitos externos ainda não validados

A integração de domínios está implementada por API oficial, mas a associação de um domínio real, propagação DNS, emissão HTTPS e implantação Vercel dependem de credenciais/projeto/domínio do proprietário. Nenhum desses resultados foi simulado ou declarado concluído. O Supabase de produção também deve receber migrations e configuração de Auth antes da implantação.

O proprietário deve criar sua conta administrativa pelo processo seguro do README; não foi inventado um e-mail ou uma senha de produção. A configuração reutilizável de instalação/inicialização foi salva como rascunho. Salvar esse rascunho não publica o ambiente e não valida restauração em uma tarefa nova.

## Estúdio Gemini

- Schema validado e HTML gerado escapado antes de persistir.
- Testes de contrato do Gemini com respostas controladas: JSON estruturado, URL Context, confirmação de referência, erros de cota e rejeição de planos inválidos.
- Banco com todas as migrations: criação atômica, slugs conflitantes sem resíduos, idempotência, isolamento de organizações, visitante sem acesso, rascunhos por padrão e limite de cinco gerações/hora.
- Build Next.js inclui páginas e rotas privadas de IA. Teste de navegador usa projeto explicitamente identificado como fixture, autenticando e persistindo dados/mídia no Supabase local.
- Geração real com Google depende de `GEMINI_API_KEY`; sem chave não há simulação nem chamada de geração confirmada.

## Tema Diário, editor visual e acesso de editores

- 27 testes de integração: permissões por portal, confirmação por e-mail autenticado, mídia isolada, revogação e rascunho de design privado, além dos testes existentes.
- Navegador: convite e cópia de acesso, entrada sem senha, bloqueio de outro portal, arraste de texto e imagem, vídeo, banner em retângulo, publicação do tema Diário e remoção do acesso. Os fluxos anteriores dos templates e da FLUE continuam validados.
- Termos de infraestrutura e variáveis removidos das telas, avisos e configuração da conta.
- O cadastro de domínio permanece pendente até a verificação real. A nova credencial necessária à conexão automática foi bloqueada pela revisão de autorização; nenhum domínio foi indevidamente ativado.
- Serviço local de captura de e-mails habilitado para testar convites sem enviar mensagens externas. Na produção, envio automático depende do serviço de e-mail; há convite copiável de uso único como alternativa.

## Experiência premium e anúncios compartilhados

- 34 testes de integração passaram, cobrindo menu seguro em níveis, limites de layout, segmentação por página/editoria, cor do título independente da seção, inserção de anúncios em HTML balanceado, renderização de fontes, referência obrigatória e reparo de plano multimodal inválido.
- Cinco fluxos Playwright validam os três temas, galeria comercial, criação e pausa de campanha, vídeo em parceiro/anúncio, menu lateral com submenu e Escape, formulário compacto, rodapé clicável, cores por clique, campanha exclusiva de notícia e de seção, rascunhos, perfis de editor e atualização de artes.
- Fonte incluída no rastreamento das funções de criação e do painel. Imagens de referência são validadas, limitadas a 1 MB cada e enviadas ao modelo somente durante a geração; não ficam expostas no histórico.
- A entrega automática de e-mails e a ativação administrativa dos domínios continuam dependendo das conexões externas descritas anteriormente; esta alteração não cria credenciais novas nem contorna a rejeição de autorização.
