# PROMPT 3/7 — Gestor de disparo

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio (separada da fundação). Rode o prompt `00-FUNDACAO-gestor-geral.md` primeiro, em outra conversa — o backend já existe, aqui você só constrói frontend.

---

## CONTEXTO DO PRODUTO

Você vai construir uma PEÇA de um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis, cada um com sua própria área, sendo construídos em conversas SEPARADAS do Google AI Studio pra depois serem unidos num código só. **Este prompt NÃO é o de fundação** — o backend inteiro (banco de dados, autenticação, todas as rotas de API) já foi definido e construído em outra peça. Aqui você constrói SÓ o frontend das telas do papel indicado em "SUA TAREFA ESPECÍFICA", consumindo exatamente o contrato de API abaixo. NÃO crie schema de banco novo, NÃO invente rotas novas, NÃO reimplemente autenticação.

Como esta conversa é isolada, você não tem acesso ao código já construído na fundação — implemente os componentes de UI que precisar seguindo à risca os tokens do design system abaixo, pra ficar visualmente idêntico às outras peças.

## STACK TÉCNICA (fixa)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend (já existe, não recriar): Node.js + Express + PostgreSQL, hospedado no Railway — SEM Supabase
- Autenticação: login individual por usuário, sessão longa
- Sem nenhuma biblioteca ou serviço de IA/machine learning em nenhuma parte do sistema — regra fixa

## DESIGN SYSTEM (fixo — use exatamente estes valores)

Referência visual: Vercel (app.vercel.com). **SEMPRE tema claro, nunca fundo escuro por padrão.**

Cor:
| Token | Hex | Uso |
|---|---|---|
| --bg-base | #FFFFFF | fundo geral |
| --bg-subtle | #FAFAFA | sidebar, linha alternada |
| --bg-hover | #F2F4F7 | hover |
| --border-default | #E4E9F0 | borda padrão |
| --border-emphasis | #C9D4E2 | borda em foco/destaque |
| --text-primary | #06080C | texto principal/título |
| --text-secondary | #5B6472 | texto de apoio |
| --text-disabled | #9AA3B2 | desabilitado/placeholder |
| --blue | #3C82FF | interativo |
| --green | #22E081 | só sucesso/confirmação |
| --amber | #E8A33D | atenção, não crítico |
| --red | #EF4444 | erro/crítico |

Regra: interface é 90% preto/branco/cinza — cor só aparece pra dizer algo.

Tipografia: título = Sora 600-800; texto = Inter 400-600; dado numérico = Inter tabular-nums.

Escala: Display 32/40 Sora700 · H1 28/36 Sora700 · H2 22/28 Sora600 · H3 18/24 Sora600 · Body 14/20 Inter400 · Body medium 14/20 Inter500 · Small 12/16 Inter400 · Micro 11/14 Inter500 uppercase.

Espaçamento: base 4px, escala 4/8/12/16/24/32/48/64/96. Sidebar 240px desktop, vira menu inferior/gaveta mobile.

Raio: sm 6px · md 8px · lg 12px · full 999px.

Sombra: mínima — card sem sombra, só borda; dropdown/modal 0 4px 16px rgba(6,8,12,0.10).

Ícone: linha, 1.5px, 16/20/24px, --text-secondary por padrão.

Botão primário: fundo --text-primary (preto), texto branco. Secundário: borda --border-default. Destrutivo: borda --red.

Badge: pill, fundo claro + texto forte da mesma cor.

## COMPONENTES A REUTILIZAR/IMPLEMENTAR
Botão · Tabela · Badge de status · Card de KPI · Campo de formulário · Modal · Sidebar · Toast · Filtro/busca.

## MODELO DE DADOS RELEVANTE (já existe no backend, use estes nomes exatos)
- **Célula** — celulaId, operacaoId, status, metaDisparosDia(500)
- **Lead** (campos de disparo) — leadId, telefone, celulaId, estagioAtual (`novo`→`disparado`→`entregue`→`nao_respondeu`/`respondeu`), dataDisparo
- **Interação** — tipo=`disparo`, timestamp, conteudo
- Templates de disparo: categoria (utilidade/marketing/autenticação), status de aprovação, quality rating por célula/número

## PIPELINE — estágios que este papel movimenta
`novo` → `disparado` → `entregue` → `nao_respondeu` (automático, via confirmação de API) ou `respondeu` (via webhook)

## PERMISSÕES relevantes pro Gestor de disparo
Vê SÓ dados de disparo/entrega, cross-célula (todas as células). NÃO vê conteúdo de venda, comissão, nem lead individual além do necessário pra confirmar entrega. NÃO acessa pipeline de venda. Pode criar/editar template de disparo. Vê status da API/quality rating.

## O QUE NÃO ENTRA EM NENHUMA TELA
- Nenhuma feature de IA/machine learning
- Nenhum ranking entre vendedores (esse papel nem vê vendedor, então nem se aplica, mas fica registrado)
- Nenhum papel "Auditor"
- Nenhuma integração automática de pagamento
- Nenhum chat embutido no CRM

## ESTADOS DE TELA (obrigatório prever os 5 em toda tela)
1. Vazio · 2. Carregando (skeleton) · 3. Erro (tela inteira: ícone + "Não deu pra carregar agora." + "Tentar de novo"; ação pontual: toast vermelho) · 4. Sucesso (toast verde 4s) · 5. Parcial (neutro até ~14h)

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas)

Base: `/api`

```
POST /api/auth/login
GET  /api/auth/me

GET /api/celulas?status=

POST /api/webhooks/disparo        (entrada — confirmação de entrega/leitura/resposta, não precisa consumir diretamente no frontend, é servidor-a-servidor)
GET  /api/disparo/saude?celulaId=
GET  /api/disparo/templates
POST /api/disparo/templates

GET /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Gestor de disparo

Cuida da infraestrutura de mensagem (API oficial WhatsApp). Compartilhado entre até 5 células. **Não vê pipeline de venda nem lead individual além do necessário pra confirmar entrega** — este papel é só operacional de infraestrutura.

**Tela principal ao logar:** Painel de disparo (cross-célula)

**Menu lateral:**
1. Painel de disparo (home)
2. Templates (aprovados, pendentes, rejeitados)
3. Saúde da conta (quality rating, teto de envio)
4. Histórico de custo

**Painel de disparo**
- 1 card por célula ativa: disparos enviados hoje / meta, % entregue, % lido, % respondido
- Botão "disparar" ou status automático (conforme integração real com a API)
- Alerta visual se alguma célula não bateu a meta de disparo do dia

**Templates**
- Lista de templates com categoria (utilidade/marketing/autenticação), status de aprovação
- Ação: submeter novo template

**Saúde da conta**
- Quality rating por célula/número
- Teto de envio atual e histórico de subida
- Alerta se rating cair

**Histórico de custo**
- Tabela: dia, célula, disparos, custo (R$3/100)
- Total do mês

**Notificações que recebe:** template rejeitado · quality rating caindo · célula sem disparar no horário esperado

**Copy literal:** "Salvar" · "Cancelar" · "Ver detalhes".

Construa: as 4 telas acima com os 5 estados previstos, consumindo o contrato de API, design system aplicado. Não crie backend, não crie schema, não reimplemente autenticação.
