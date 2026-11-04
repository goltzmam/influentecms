# Implantação e automação

A publicação do ambiente no ChatGPT e a implantação do site na Vercel são processos independentes. Não há ferramenta nesta sessão para acionar ou consultar a causa interna da publicação do snapshot do ChatGPT. Salvar o rascunho não publica. O site pode ser implantado diretamente pelo GitHub/Vercel sem depender desse botão.

## Vercel

O projeto `influentecms` está associado a `goltzmam/influentecms`, branch `main`. A configuração é Next.js, Node 24, instalação `npm ci` e build `npm run build`. As variáveis públicas Supabase e `APP_URL` são provisionadas por `npm run release:configure`. O script não copia chaves locais de desenvolvimento para produção.

A integração nativa Vercel/GitHub deve criar um deployment a cada push em `main`. `npm run release:status` consulta o resultado. Se um evento do GitHub não iniciar a implantação, `npm run release:deploy` solicita uma implantação de produção da branch configurada por API oficial.

Os comandos de controle da Vercel exigem `VERCEL_API_TOKEN` e `VERCEL_PROJECT_ID` no ambiente do operador. Nunca faça commit dos valores. O token proxy deste ambiente é usado somente nas chamadas HTTPS autorizadas à Vercel; não é copiado como se fosse uma credencial bruta reutilizável.

## Supabase hospedado

Conectar URL e publishable key habilita a API pública, mas não autoriza criar tabelas, políticas ou administradores. O projeto deve receber as migrations, cadastro público desativado e provisionamento do proprietário antes do uso real do painel.

Cadastre `SUPABASE_ACCESS_TOKEN` no gerenciador seguro do ambiente para autorizar a API administrativa oficial. Depois:

```sh
npm run release:migrate
```

O script infere o projeto exclusivamente de `NEXT_PUBLIC_SUPABASE_URL`, aplica migrations com transação, trava e registro de versão, e preserva as já aplicadas. Em seguida desativa cadastros públicos. Quando houver também acesso Vercel, tenta configurar a service role retornada pela API do projeto somente como segredo do servidor Vercel. Nenhuma chave é exibida em logs ou gravada no código. Se o provedor não retornar a chave, configure-a manualmente e de forma segura no runtime da Vercel.

O proprietário inicial é criado pelo processo seguro `scripts/create-admin.mjs`, descrito no README. Não existem senha padrão ou conta administrativa fictícia.

## GitHub Actions

`checks.yml` executa instalação congelada, testes locais e build a cada push/pull request. Os testes de API remota são ignorados quando suas variáveis não estão disponíveis no runner; isso não comprova prontidão de produção.

`supabase.yml` permite disparar migrations manualmente pelo Actions. Para execução automática quando migrations mudarem, configure no GitHub o segredo `SUPABASE_ACCESS_TOKEN` e a variável `SUPABASE_MIGRATIONS_ENABLED=true`. A variável pública `NEXT_PUBLIC_SUPABASE_URL` pode substituir o destino padrão registrado no workflow. Sem ativação explícita, as migrations automáticas ficam pendentes, não são simuladas.

O token GitHub desta sessão foi recusado (HTTP 403) ao gerenciar variáveis/segredos do Actions. Isso é uma permissão específica, distinta de acesso ao repositório. Não copie placeholders de segredos proxy para o GitHub. Se essa permissão continuar indisponível, configure o segredo diretamente em Settings → Secrets and variables → Actions. Essa limitação não impede a integração nativa GitHub → Vercel.

## Diagnóstico

Use `npm run release:status` e as consultas somente leitura da API. Nunca exponha tokens, senhas ou valores de variáveis ao compartilhar erros. Respostas `PGRST205` em `portals`/`organizations` indicam ausência das tabelas na API/schema cache; aplicar migrations é necessário antes de considerar o CMS pronto. O teste `tests/release.test.mjs` executa o mecanismo transacional duas vezes e verifica preservação de conteúdo.

## Bootstrap administrativo pelo build

O projeto usa `npm run build:vercel`: em produção aplica migrations e faz bootstrap; previews apenas compilam e nunca alteram o banco ou proprietário de produção. Com `ADMIN_EMAIL` e `ADMIN_PASSWORD` configurados somente em Production, o script usa a chave administrativa retornada pela API Supabase em memória para criar o proprietário e verificar login/autorização. A senha nunca é gravada no código ou em logs. Use pelo menos 12 caracteres. Após confirmar o primeiro acesso, remova `ADMIN_PASSWORD` do projeto Vercel; o usuário permanece no Supabase Auth. Repetir o build não altera a senha de um proprietário existente. Falhas posteriores à concessão da autorização não removem uma conta válida.

## Conexão de domínios pelo painel

O servidor exige `VERCEL_API_TOKEN` em Production, restrito ao projeto. Autorizar no chat não amplia as permissões da conexão de origem: se `POST /v3/user/tokens` responder 403, o proprietário precisa criar a credencial nas configurações de tokens da conta e salvá-la diretamente em Settings → Environment Variables do projeto; nunca pelo chat, Git ou logs. Após salvar, publique um novo deployment. A autorização recebida nesta sessão permite somente o projeto `influentecms`, por 90 dias. Não substitua por acesso amplo ou duração maior.

O fluxo reserva o domínio globalmente, associa-o ao projeto, apresenta desafios TXT e recomendações DNS oficiais e verifica propriedade + hostname + projeto + configuração antes de marcar como conectado. Recomendações IPv4 contêm arrays; o painel mostra os endereços separadamente e prefere rank=1. A consulta inclui `projectIdOrName`, necessária para credenciais restritas. Uma verificação TXT ainda pendente preserva as instruções DNS. A tela consulta novamente a cada 30 segundos enquanto estiver visível; não é um serviço de monitoramento em segundo plano após fechar a página. Registros MX são preservados e mudanças no registrador continuam sendo necessárias quando não há uma integração autorizada com ele.
