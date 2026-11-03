# Influente CMS

CMS privado para administrar múltiplos portais de notícias. Next.js App Router, TypeScript, Tailwind, componentes no padrão shadcn/ui (Radix/CVA), Supabase Auth/PostgreSQL/Storage, TipTap e dnd-kit. Sem planos, pagamentos, cadastro público ou faturamento.

## Recursos

- Dashboard e seletor de portais com estatísticas reais do acervo.
- Criação de portal com nome, slug, logotipo, cor e escolha de Influente News ou Revista Influente.
- Notícias com TipTap, imagens, YouTube, categoria, tags, autor, SEO, rascunho, prévia privada, publicação, agendamento, edição e exclusão.
- Homepage com blocos predefinidos reordenáveis por arraste ou teclado: recentes, destaques escolhidos, categoria, banners, texto e imagem com link. Rascunho separado da versão pública, prévia do próprio template em tempo real e prévia completa da versão salva.
- Identidade, fontes, favicon, menus, redes sociais, cabeçalho, rodapé e páginas institucionais. Troca de template sem perda do conteúdo.
- Biblioteca de imagens com validação e otimização; campanhas com posição, vigência e ativação; parceiros e logotipos.
- Sites públicos com home, notícia, editoria, busca paginada e páginas institucionais.
- Domínios únicos, reserva e verificação via API oficial Vercel; roteamento por hostname verificado e suporte a subdomínios wildcard.
- Canonical, Open Graph, Twitter Card, NewsArticle, sitemap de artigos/editorias/páginas, sitemap de notícias das últimas 48 horas, RSS e robots.

## Estrutura visual dos portais

Os templates **Influente News** e **Revista Influente** compartilham a estrutura do PDF de referência fornecido pelo proprietário: cabeçalho roxo, marca e navegação por colunas, busca e WhatsApp, faixa publicitária, manchetes com seleção numerada, vídeo lateral, chamada com lista de notícias, publieditorial, editorias com patrocínio, redes sociais, contato, novidades e rodapé comercial. A tipografia e toda a identidade podem ser personalizadas por portal. Os identificadores internos `classic` e `modern` foram preservados para manter compatibilidade com os dados existentes.

Em **Personalização**, altere as quatro cores da paleta, logo/favicon, assinatura, vídeo YouTube, WhatsApp, títulos e textos dos formulários, contatos, cartões sociais e SEO/OG da capa. Escolha navegação automática por categorias ou apenas seus links; ordene os links pelas setas. Os cartões sociais usam imagens e links enviados pelo proprietário, sem inventar seguidores ou integrar dados de redes sociais silenciosamente.

Em **Homepage**, use **Usar estrutura do PDF** para montar um rascunho com a capa de referência e editorias. O botão modifica somente a composição no editor até salvar/publicar. Reordene os blocos por mouse ou teclado, selecione manchetes e publieditorial, escolha mosaico de notícias ou composição de revista e configure marca, cor e link de patrocinadores. Escolha posições de anúncios também entre editorias e ao lado do publieditorial. A prévia usa os mesmos componentes das páginas públicas. Versões publicadas anteriormente não são sobrescritas pela atualização.

A migration `202611030003_audience.sql` adiciona mensagens e inscrições por portal com RLS e RPCs públicas validadas e limitadas por frequência. **Leitores e contato** mostra os registros privados e exporta CSV; o formulário solicita consentimento. Inscrição registra interesse em receber novidades, sem criar conta de acesso e sem disparar campanhas de e-mail automaticamente. Para isso, integre posteriormente uma ferramenta de envio. Os dados de teste e as imagens geradas para capturas são exclusivos dos testes e removidos ao final.

## Desenvolvimento local

Pré-requisitos: Node **24**, npm e Docker em execução. Use o checkout existente; não é necessário worktree.

```sh
npm ci
npm run supabase:start
npm run local:env
```

Em ambientes com proxy Docker, o `wget` usado nos checks internos de Auth/Storage pode ignorar `NO_PROXY` e retornar falso negativo. Confirme primeiro o endpoint local com `wget -Y off` dentro do respectivo contêiner. Somente nesse caso, inicie com `npm run supabase:start -- --ignore-health-check` e **exija** `node scripts/check-local.mjs` e os testes E2E antes de declarar prontidão. Essa opção não substitui validação nem deve ocultar falhas reais. Preserve o proxy e a verificação TLS para destinos externos.

O comando de inicialização aplica migrations pendentes também em instalações locais existentes, sem resetar dados. `local:env` gera `.env.local` com as credenciais **locais** sem imprimi-las e recusa sobrescrever um arquivo existente. Se você já possui `.env.local`, preserve seus valores e configure manualmente. Novos cadastros estão desativados em `supabase/config.toml`. Não há seed de notícias, portais ou dados demonstrativos.

Provisione seu administrador pelo processo seguro abaixo. Depois:

```sh
npm run dev
```

O servidor aceita a porta padrão 3000. Não se deve publicar credenciais administrativas no navegador. Para parar os serviços locais preservando dados: `npm run supabase:stop` (não use opções de exclusão de backup). Processos precisam reiniciar em uma nova máquina; imagens/volumes Docker podem exigir restauração própria dependendo do ambiente de execução.

## Projeto Supabase hospedado

1. Crie um projeto de desenvolvimento ou produção no Supabase. Desabilite **Allow new users to sign up** e provedores não utilizados. Configure limites de autenticação no provedor. A ausência de uma página de cadastro não bloqueia a API de signup.
2. Aplique em ordem os arquivos `supabase/migrations/*.sql` pelo SQL Editor, ou vincule o CLI ao projeto correto e execute `supabase db push`. Revise o destino antes de aplicar. Não execute reset em um banco com dados.
3. Copie `.env.example` para `.env.local` e configure URL, publishable key e `APP_URL`. A aplicação usa RLS, sem service role para consultas editoriais ou uploads.
4. Para bootstrap e conexão de domínios, configure a service role **somente no servidor**. Nunca use prefixo `NEXT_PUBLIC_` para chaves administrativas. Os valores podem ser fornecidos pelo gerenciador seguro de segredos do ambiente. Nunca cole credenciais em chat ou no Git.
5. Execute `npm ci`, `npm run build` e `npm run start`.

O bucket público `portal-media` é criado pela migration. Imagens públicas devem estar prontas para divulgação: uploads são validados, reencodificados para WebP, têm metadados removidos e são limitados a 5 MB de entrada/40 megapixels. Imagens animadas e SVG são recusados. Arquivos locais e externos existentes continuam sujeitos à sanitização na renderização.

## Administrador inicial

O script recebe credenciais pelo ambiente; use um shell seguro ou arquivo local ignorado com permissão restrita. Não escreva valores no histórico de comandos. Defina `ADMIN_EMAIL` e uma senha única de pelo menos 16 caracteres em um arquivo local ignorado. Com URL e service role configurados:

```sh
node --env-file=.env.local scripts/create-admin.mjs
```

O script cria uma conta confirmada via Admin API e provisiona uma organização por transação. Em falha, tenta remover exclusivamente o usuário que acabou de criar. Uma organização já provisionada impede bootstrap acidental de outro workspace. Remova `ADMIN_EMAIL` e `ADMIN_PASSWORD` depois; mantenha service role apenas se precisar da integração de domínios. Troca/recuperação de senha é administrativa pelo Supabase Auth; não existe cadastro público nem fluxo comercial.

## Usar o CMS

Entre, crie um portal e configure categorias. Em Notícias, escreva, envie a capa e escolha rascunho, publicação imediata ou agendamento. As datas dos formulários são **UTC**; listagens públicas usam Brasília. Agendamentos ficam visíveis por condição de banco no horário definido, sem depender de um cron ou de um processo aberto. Consultas públicas não usam cache de página; feeds XML podem ter cache de até 60 segundos.

O endereço provisório sempre funciona em `/p/slug` na aplicação. Com `PORTAL_BASE_DOMAIN=portais.seudominio.com.br`, configure DNS wildcard e associe `*.portais.seudominio.com.br` ao mesmo projeto Vercel para habilitar `slug.portais.seudominio.com.br`. O slug é estável e único.

Em Homepage, salve um rascunho e abra sua prévia privada. Publicar aplica a composição pública. A prévia de notícia também exibe a **versão salva**, não alterações ainda não enviadas. Se a homepage não tiver seções publicadas, o template exibe notícias recentes automaticamente. A prévia em tempo real usa os mesmos componentes do template público com as alterações atuais do editor; a prévia completa abre a versão salva em tamanho real.

Campanhas só aparecem quando ativas e dentro da vigência. Posições suportadas: cabeçalho, lateral e rodapé. Ao excluir mídia, revise primeiro seus usos em notícias, logos e banners; a exclusão remove o arquivo do Storage. Categorias em uso não podem ser excluídas até as notícias serem reclassificadas.

## Domínios e Vercel

Configure `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, opcionalmente `VERCEL_TEAM_ID`, e a service role do Supabase no runtime do servidor. O token precisa permitir gerenciar os domínios do projeto. Autorize `api.vercel.com` e o hostname do Supabase na política de rede do ambiente, quando restrita.

O painel reserva o hostname no banco, associa-o via `POST /v10/projects/{project}/domains` e consulta a configuração oficial de DNS. Insira em seu provedor os registros recomendados pela Vercel e os TXT de comprovação, quando solicitados. O painel exibe recomendações retornadas pela API; valores específicos também ficam disponíveis em Vercel → Project → Domains. Não use IPs de exemplos no lugar dos registros do seu projeto.

“Verificar” consulta a associação ao projeto, verifica a propriedade e consulta `GET /v6/domains/{domain}/config`. O banco só marca o domínio como verificado se o provedor confirmar propriedade e DNS correto. HTTPS é emitido e renovado pela Vercel e pode ter propagação adicional; o app não emite certificados por conta própria. Um domínio pendente não recebe tráfego editorial pela resolução de hostname. Falhas parciais deixam a reserva pendente e permitem tentar verificar novamente. Desconectar remove a associação do projeto e depois o registro local; isso pode afetar tráfego desse domínio.

As credenciais Vercel são necessárias para testar esta integração real. Nenhuma conexão real de domínio é simulada. O código não publica o projeto ou altera DNS automaticamente.

## Segurança e arquitetura

- Cada portal tem ID próprio e organização. Conteúdo usa FK composta `(organization_id, portal_id)`, impedindo referências entre organizações; categorias usam FK composta com o portal.
- A sessão é verificada no servidor em todas as telas e mutações privadas; o proxy renova cookies. RLS autoriza cada operação também pela API direta.
- Público acessa somente os campos públicos dos portais, notícias liberadas por status/data, campanhas vigentes, parceiros ativos e páginas publicadas. `home_draft` não tem grant de leitura direta; a RPC valida propriedade. Organizações, membros e biblioteca de mídia são privados.
- A permissão de verificação de domínio é exclusiva do servidor administrativo. Clientes autenticados não podem inserir `verified=true` ou atualizar esse estado pela API.
- Uploads exigem dono do portal; os caminhos incluem organização e portal. Conteúdo HTML é sanitizado ao salvar e novamente ao renderizar. JavaScript, eventos e iframes externos são removidos; vídeos aceitam YouTube. Links externos usam HTTPS; HTTP é aceito somente em loopback para desenvolvimento local.
- Server Actions protegem mutações por mesma origem; logout verifica origem e aceita somente POST. Segredos nunca são retornados nas telas de configurações.
- O modelo comporta organizações futuras, mas esta interface opera um workspace privado por proprietário. Não há gestão de clientes externos.

## Testes e validação

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

Os testes locais usam PostgreSQL embarcado PGlite para executar as três migrations com papéis, sessão e esquemas de Auth/Storage preparados exclusivamente no teste. Eles verificam RLS, referências cruzadas, publicação temporal, restrição de verificação de domínio, grants de rascunho, uploads e sanitização. Não substituem o Auth/Storage reais: o conjunto E2E abaixo usa a instância local real.

Os testes `tests/access.test.mjs` acessam a API real quando URL/key estiverem presentes no processo. Sem variáveis eles são explicitamente ignorados. Para carregá-las:

```sh
node --env-file=.env.local --experimental-strip-types --test tests/*.test.mjs
```

Com Supabase local e build pronto:

```sh
npm run test:e2e
```

O Playwright usa Chromium em `/usr/bin/chromium` (ajuste `CHROMIUM_PATH` se necessário). Cria um usuário e organização exclusivos para o teste, executa CRUD pelo navegador, verifica templates, busca, SEO, uploads e agendamento, e remove usuário/organização/arquivos criados ao final. Recusa destinos Supabase fora de loopback. Nunca execute contra produção. O teste inicia um servidor temporário na porta 3100; screenshots e traces de falha ficam ignorados pelo Git.

## Automação de implantação

Consulte [DEPLOYMENT.md](DEPLOYMENT.md) para configuração Vercel por API, integração automática com GitHub e migrations Supabase transacionais.

## Produção, publicação e backups

Vincule este repositório a um projeto Vercel, configure as variáveis e aplique as migrations no Supabase de produção. Defina `APP_URL` com HTTPS e o domínio principal do CMS. Configure wildcard se necessário, e não mantenha usuários ou portais de teste em produção. As verificações locais não comprovam DNS, HTTPS nem restauração em um ambiente publicado.

Habilite backups gerenciados/PITR conforme seu plano Supabase, com retenção, responsável e restauração periódica em projeto isolado. Mantenha exportações criptografadas fora do projeto. Backups do PostgreSQL não substituem os dos objetos do Storage: configure cópia separada dos objetos e teste a restauração em conjunto com suas referências no banco. Guarde credenciais no gerenciador de segredos; não em exportações de teste. Documente RPO/RTO e faça simulação de recuperação antes de operar conteúdo crítico.

Os feeds têm limites de protocolo: RSS inclui as 50 publicações mais recentes, news sitemap até 1.000 publicações das últimas 48 horas e sitemap até 50.000 registros. Para volumes maiores, implemente particionamento de sitemaps antes de atingir esses limites. Listagens privadas mostram até 200 resultados por busca; a busca pública tem paginação. Não há contadores fictícios de audiência ou serviço de analytics terceirizado embutido.
