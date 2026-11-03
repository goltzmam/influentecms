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
