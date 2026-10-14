# Ambientes e isolamento

O fluxo de publicação continua separado:

```text
feature/* → feature/landing-page → staging (GitHub Pages) → production (Vercel)
```

Esta branch adiciona o isolamento do DEV:

| Ambiente | Frontend | Supabase | Contingência |
| --- | --- | --- | --- |
| DEV | Live Server/Python local | Docker + Supabase CLI local | Serviço JSON local |
| UAT | GitHub Pages | Projeto remoto futuro | Definida posteriormente |
| PRD | Vercel | Projeto remoto atual | Google Sheets atual |

UAT e PRD continuam usando a configuração remota existente. O frontend usa a
configuração local somente em hosts locais quando `invite-app/dev-config.json`
foi gerado pelo setup. Sem esse arquivo, o frontend DEV falha explicitamente;
ele não cai para o Supabase remoto.

O setup local nunca usa `service_role` no navegador, nunca configura Google
Sheets em DEV e só consulta PRD com um GET público de `event-config` quando o
snapshot local ainda não existe. A configuração e a contingência locais ficam
em arquivos ignorados pelo Git.

Deploys, workflows, branches de UAT/PRD e serviços remotos não são alterados
por `npm run dev:*`.
