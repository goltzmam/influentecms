# Influente CMS

CMS privado para administrar múltiplos portais de notícias. Next.js App Router, TypeScript, Tailwind, componentes no padrão shadcn/ui (Radix/CVA), Supabase Auth/PostgreSQL/Storage, TipTap e dnd-kit. Sem planos, pagamentos, cadastro público ou faturamento.

## Recursos

- Dashboard e seletor de portais com estatísticas reais do acervo.
- Criação de portal com nome, slug, logotipo, cor e escolha de Influente News, Revista Influente ou Jornal Diário.
- Notícias com TipTap, imagens, YouTube, categoria, tags, autor, SEO, rascunho, prévia privada, publicação, agendamento, edição e exclusão.
- Homepage com blocos predefinidos reordenáveis por arraste ou teclado: recentes, destaques escolhidos, categoria, banners, texto e imagem com link. Rascunho separado da versão pública, prévia do próprio template em tempo real e prévia completa da versão salva.
- Identidade, fontes, favicon, menus, redes sociais, cabeçalho, rodapé e páginas institucionais. Troca de template sem perda do conteúdo.
- Biblioteca de imagens com validação e otimização; campanhas com posição, vigência e ativação; parceiros e logotipos.
- Sites públicos com home, notícia, editoria, busca paginada e páginas institucionais.
- Domínios únicos, reserva e verificação via API oficial Vercel; roteamento por hostname verificado e suporte a subdomínios wildcard.
- Canonical, Open Graph, Twitter Card, NewsArticle, sitemap de artigos/editorias/páginas, sitemap de notícias das últimas 48 horas, RSS e robots.

## Estrutura visual dos portais

Os três temas possuem composições independentes, mantendo dados e controles compartilhados:

- **Influente News** (`classic`): PDF fornecido, cabeçalho com navegação em colunas, carrossel numerado, vídeo lateral, resumo de notícias e mosaicos de editorias.
- **Revista Influente** (`modern`): marca editorial centralizada, capa dividida entre texto e imagem, faixa de três histórias, grade assimétrica de editorias e últimas histórias em cartões com imagens de proporções variadas.
- **Jornal Diário** (`daily`): cabeçalho compacto, manchete ampla, notícias em feed vertical com miniaturas e títulos, coluna lateral e editorias com chamada principal e lista.

Trocar o tema atualiza a composição sem apagar notícias, mídia ou seções personalizadas. Cores, menus, formulário, publicidade e rodapé continuam editáveis em todos.

Em **Personalização**, altere as quatro cores da paleta, logo/favicon, assinatura, vídeo YouTube, WhatsApp, títulos e textos dos formulários, contatos, cartões sociais e SEO/OG da capa. Escolha navegação automática por categorias ou apenas seus links; ordene os links pelas setas. Os cartões sociais usam imagens e links enviados pelo proprietário, sem inventar seguidores ou integrar dados de redes sociais silenciosamente.

Em **Homepage**, use **Usar composição editorial** para montar um rascunho com a capa de referência e editorias. O botão modifica somente a composição no editor até salvar/publicar. Reordene os blocos por mouse ou teclado, selecione manchetes e publieditorial, escolha mosaico de notícias ou composição de revista e configure marca, cor e link de patrocinadores. Escolha posições de anúncios também entre editorias e ao lado do publieditorial. A prévia usa os mesmos componentes das páginas públicas. Versões publicadas anteriormente não são sobrescritas pela atualização.

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

O script recebe credenciais pelo ambiente; use um shell seguro ou arquivo local ignorado com permissão restrita. Não escreva valores no histórico de comandos. Defina `ADMIN_EMAIL` e uma senha única de pelo menos 12 caracteres em um arquivo local ignorado. Com URL e service role configurados:

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

### Estúdio FLUE

No painel, abra **Criar com IA**. Descreva nome, público, tema, cores e seções; opcionalmente informe até três referências HTTPS públicas. A FLUE prepara identidade, categorias, homepage, páginas e textos editoriais originais. Revise a prévia, ajuste nome, endereço, template e paleta e clique em **Criar portal editável**. Tudo continua disponível nos editores existentes, inclusive TipTap, mídia, SEO e homepage arrastável.

Configure `GEMINI_API_KEY` como variável secreta na Vercel (Production) e faça um novo deploy. A chave permanece no servidor. O modelo padrão é `gemini-3.6-flash`; `GEMINI_MODEL` permite substituí-lo por um modelo compatível com JSON estruturado e URL Context. A geração usa a API paga/limitada da sua conta Google, com até cinco tentativas por organização por hora. Referências inacessíveis são sinalizadas; textos, marcas e imagens de terceiros não são copiados. Logo tipográfico, favicon e ilustrações são produzidos com a identidade escolhida; fotografias podem ser adicionadas pela biblioteca.

A migração `202611030004_ai_portals.sql` instala histórico privado e criação transacional. Artigos começam em rascunho, salvo publicação expressamente selecionada na revisão; páginas legais permanecem rascunhos. Projetos prontos podem ser reabertos e falhas de criação não deixam estruturas parciais. Testes de provedor usam respostas controladas; geração real exige a chave e não é substituída por conteúdo simulado.

A FLUE é a marca exibida no painel. O serviço tenta modelos de texto disponíveis na conta quando a geração principal fica indisponível, sem simular resultados. A migração `202611030005_flue_retries.sql` permite retomar falhas temporárias sem consumir a cota de portais. `scripts/check-flue-flow.mjs` valida o fluxo autenticado com geração real, referência, criação, mídia e portal público usando uma organização descartável, removida ao final; execute somente em contexto administrativo autorizado.

### Tema Diário, editor visual e equipe

O tema **Jornal Diário** apresenta manchete com imagem ampla, chamadas, feed vertical e coluna lateral. Sua marca e cores continuam editáveis. No editor da página inicial, arraste blocos e imagens da biblioteca ou do computador para a prévia, mova as seções pela alça e personalize vídeos, larguras, espaçamento e cores. Banners aceitam formatos amplo, faixa, retângulo, quadrado, vertical e conteúdo patrocinado. Alterações de composição e identidade podem ser salvas em rascunho antes de publicar.

Em **Equipe**, o proprietário adiciona o e-mail de cada editor. O convite usa confirmação segura por link, sem senha; o destinatário recebe acesso apenas aos portais atribuídos. É possível reenviar, copiar um convite de uso único e revogar o acesso. A entrega automática requer serviço de e-mail configurado; copiar convite permite compartilhar o acesso quando o envio está indisponível. Cadastro público permanece desativado. Editores não criam portais, não gerenciam equipe e não acessam rascunhos de outros portais.

As migrations 006 e 007 adicionam permissões e rascunho de design. O backend pode obter a credencial administrativa existente pelo gerenciamento do projeto, sem expô-la no painel. O cadastro de domínio pode ficar pendente, mas sua ativação depende da autorização administrativa de hospedagem, propriedade e registros de endereço corretos; cadastrar não significa verificar. A criação de uma nova credencial persistente de hospedagem foi bloqueada pela revisão automática e aguarda autorização explícita do usuário.

### Experiência premium compartilhada entre os temas

**Personalização → Experiência do portal** controla navegação horizontal, botão de menu, painel lateral ou modo híbrido; marca centralizada; menu fixo; submenus em dois níveis; cores próprias ou herdadas. O formulário pode ser aberto, compacto, expansível, oculto ou em painel. Largura, colunas, campos opcionais, textos, consentimento, cantos, cores e botão são configuráveis. O rodapé oferece composição por colunas, centralizada ou essencial, marca própria, busca, links e submenus, redes, créditos e chamada para anunciantes com imagem/vídeo e destino clicável.

No **Editor visual**, clicar no título ou na copy da seção abre seus controles. Título, faixa do título, copy, cartões e fundo da seção têm cores e medidas independentes. Clicar no menu, formulário, rodapé ou parceiros abre o painel correspondente. A prévia e a publicação usam os mesmos componentes e respeitam o rascunho de design.

**Publicidade** e **Parceiros** usam biblioteca com cartões, busca, editor e prévia. Campanhas podem ter imagem, vídeo ou texto; formatos prontos ou dimensões personalizadas; ajustes, alinhamento, cores e cantos. A veiculação pode ser limitada por tipo de página, endereço específico, editoria, seção, dispositivo e período. Há espaços antes/depois do conteúdo, na notícia, em páginas institucionais, na lateral, no rodapé e repetição no feed. Uma campanha vinculada a uma seção só aparece naquela seção. Todos esses recursos pertencem à estrutura compartilhada, e não ao CSS de um único tema.

A FLUE aceita até três capturas PNG/JPG/WebP de até 1 MB cada, além dos links públicos. Referências bloqueadas são sinalizadas; gerar sem leitura confirmada exige a opção explícita de continuar pelo briefing, ou o envio de capturas. O plano inclui componentes e aparência editáveis; uma resposta inválida recebe tentativa de reparo validada antes de ser salva. Não há garantia de cópia exata de qualquer site nem uso de marcas/imagens de terceiros. Artes de marca usam fonte licenciada incluída no projeto. **Biblioteca → Atualizar artes de marca** recria logos e capas da FLUE sem apagar os arquivos anteriores nem as fotografias enviadas.

## Editor visual e monetização

Em **Homepage**, use **Editar em tela cheia**. A prévia renderiza a página completa com a mesma composição publicada. Selecione uma seção no site ou na lista à esquerda; o inspetor mostra apenas seus controles. Arraste blocos, arquivos e imagens da biblioteca; use os controles Mover ou as setas para reorganizar. Mudanças permanecem em rascunho até Publicar homepage.

A paleta distingue **Publicidade** (amarelo), **Google Ads** (cinza) e **Patrocinador** (laranja). Arraste um espaço para os alvos antes, título, lateral ou depois da seção. Em Publicidade nesta seção, escolha a campanha, o formato, dimensões personalizadas, cor, dispositivos e visibilidade do espaço vazio. Arrastar um espaço existente move seu ID e configuração; não cria outra campanha. Uma campanha vinculada a um espaço deixa de ser repetida na posição automática da homepage. As mesmas opções estão disponíveis nos três temas, nas composições da FLUE e nos portais existentes. Influente News mantém capa + resumo + publieditorial na coluna principal com lateral contínua, mosaico de política, patrocínios nos títulos e grade de entretenimento.

Em **Personalização → Google AdSense**, cole o código oficial ou informe ca-pub; depois configure IDs dos blocos no editor. O CMS importa somente os identificadores e carrega o SDK oficial, sem executar JavaScript arbitrário salvo. Campanhas também oferecem Google AdSense para posições dentro de notícias, editorias, busca e páginas institucionais. O SDK é deduplicado e os anúncios não são solicitados no editor ou nas prévias privadas. O ads.txt do portal é gerado em `/p/slug/ads.txt` e fica em `/ads.txt` quando há domínio próprio conectado. Publicação da integração não substitui conta, aprovação, configuração e disponibilidade de anúncios do Google. Não há dados de receita ou aprovação simulados.

## Métricas comerciais e composição visual FLUE

Cada portal tem **Métricas comerciais**, com filtros de período, publicidade/parceiros e peça individual, evolução diária e PDF. Publicidade e Parceiros também oferecem atalhos para o relatório da peça. Medimos exibições renderizadas, visualizações com ao menos 50% visível durante 1 segundo (vídeo: 2 segundos), cliques em links/chamadas, alcance anônimo, frequência, visibilidade, origens, dispositivos e posições. Vídeos enviados têm início, quartis, conclusão e tempo assistido; players externos não fornecem esses eventos. CPC e CPM exigem investimento informado manualmente para o período. Dados próprios não substituem relatórios oficiais AdSense: não interceptamos cliques do Google, nem inventamos receita, conversões, retorno ou aprovação.

A coleta inicia após a publicação desta versão, sem preencher histórico inexistente. Prévias privadas, peças marcadas Demonstração, bots conhecidos e navegadores com DNT/GPC ficam fora. Eventos são validados no servidor, limitados por portal/IP anonimizado e deduplicados; não armazenamos IP bruto, e-mail ou parâmetros de URL. `ANALYTICS_HASH_SECRET` deve permanecer estável e restrito ao servidor. Relatórios e PDFs exigem proprietário ou editor atribuído ao portal. Migration 009 cria eventos e agregação; cada consulta permite até 180 dias. Não há exclusão automática de histórico nesta versão.

A FLUE agora cria capas editoriais reais, logo, ícone, imagens de comunidade e peças demonstrativas para publicidade horizontal, retangular, vertical, patrocínio e parceiro. Usa geração visual quando disponível e ilustração original temática quando o serviço de imagens não responde. A biblioteca guarda os arquivos editáveis/substituíveis. Conteúdos iniciais ficam publicados por padrão, com opção de rascunho antes da criação; são textos editoriais ilustrativos, sem inventar acontecimentos recentes. Não criamos contas externas nem identificadores fictícios de redes ou AdSense. As chamadas de comunidade apontam para páginas reais do próprio portal até que o usuário configure seus links. Migration 010 permite retomar composição interrompida sem duplicar o portal ou suas peças.

A geração completa opções de apresentação omitidas com padrões editáveis de menu, formulário compacto, rodapé e parceiros, preservando opções válidas recebidas. Não substitui conteúdo editorial incompleto por conteúdo fictício. O limite diário da conta conectada também se aplica a tentativas de reparo: quando atingido, a interface informa a cota e mantém o briefing. `node scripts/check-flue-flow.mjs --fixture` valida criação visual, métricas e PDF com um plano controlado; seu PASS não comprova geração de texto ao vivo. O comando sem essa opção testa a geração real e pode consumir a cota disponível.

## Gestão de portais e painel

O painel usa navegação lateral com identificação da seção, menu móvel, resumo da rede, cartões de portais e componentes visuais compartilhados em todas as áreas administrativas. O novo estilo é isolado dos temas públicos e das prévias do portal.

O proprietário pode usar **Excluir** no cartão do dashboard ou **Configurações do portal → Excluir portal**. O diálogo exige digitar o nome exato e avisa que a ação é permanente. O servidor confirma a propriedade e o nome novamente; editores não têm essa permissão. Apenas o portal selecionado e seus registros dependentes são removidos. Domínios próprios são desconectados antes da exclusão, e falha nessa etapa preserva os dados do portal. Endereços da plataforma e aliases `.vercel.app` não são removidos da hospedagem. Após a exclusão, a limpeza de mídia é restrita à pasta daquele portal; se a limpeza externa falhar, o painel informa essa pendência. Outros portais e contas de usuários são preservados. Não há recuperação de um portal excluído.
