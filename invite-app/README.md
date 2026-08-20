# Invite app

Aplicação estática inicial do convite virtual.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, com tokens de cor, responsividade mobile-first e suporte a redução de movimento.
- **Comportamento:** `scripts/main.js`, responsável pela abertura da carta e pelo estado demonstrativo do RSVP.
- **Integrações futuras:** API/Edge Function, Supabase e área administrativa serão adicionados em camadas separadas.

Essa estrutura vanilla é suficiente para a Fase 1 e evita adicionar framework ou build system antes de existir uma necessidade real.

## Como visualizar

Abra `index.html` no navegador. A capa permite abrir a carta e o formulário de RSVP exibe um aviso enquanto a integração com o backend ainda não foi implementada.

Os nomes e detalhes do evento são dados iniciais do protótipo e deverão ser substituídos pelos dados finais.
