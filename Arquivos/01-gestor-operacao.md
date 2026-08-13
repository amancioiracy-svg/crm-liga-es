# PROMPT 2/7 — Gestor da operação

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio (separada da fundação). Rode o prompt `00-FUNDACAO-gestor-geral.md` primeiro, em outra conversa — o backend já existe, aqui você só constrói frontend.

---

## CONTEXTO DO PRODUTO

Você vai construir uma PEÇA de um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis, cada um com sua própria área, sendo construídos em conversas SEPARADAS do Google AI Studio pra depois serem unidos num código só. **Este prompt NÃO é o de fundação** — o backend inteiro (banco de dados, autenticação, todas as rotas de API) já foi definido e construído em outra peça. Aqui você constrói SÓ o frontend das telas do papel indicado em "SUA TAREFA ESPECÍFICA", consumindo exatamente o contrato de API abaixo. NÃO crie schema de banco novo, NÃO invente rotas novas, NÃO reimplemente autenticação.

Como esta conversa é isolada, você não tem acesso ao código já construído na fundação — implemente os componentes de UI que precisar (botão, tabela, badge, etc.) seguindo à risca os tokens do design system abaixo, pra ficar visualmente idêntico às outras peças. O objetivo na hora de juntar tudo é que pareça a mesma aplicação, não que o código seja literalmente compartilhado.

## STACK TÉCNICA (fixa)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend (já existe, não recriar): Node.js + Express + PostgreSQL, hospedado no Railway — SEM Supabase
- Autenticação: login individual por usuário, sessão longa
- Sem nenhuma biblioteca ou serviço de IA/machine learning em nenhuma parte do sistema — regra fixa

## DESIGN SYSTEM (fixo — use exatamente estes valores)

Referência visual: Vercel (app.vercel.com) — densidade de tabela, tipografia forte, bordas finas em vez de sombra pesada. **SEMPRE tema claro, nunca fundo escuro por padrão.**

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
| --blue | #3C82FF | interativo (link, foco, selecionado) |
| --green | #22E081 | só sucesso/confirmação (venda, meta batida) |
| --amber | #E8A33D | atenção, não crítico |
| --red | #EF4444 | erro/crítico |

Regra: interface é 90% preto/branco/cinza — cor só aparece pra dizer algo, nunca decora.

Tipografia: título = Sora 600-800; texto/interface = Inter 400-600; dado numérico (Lead ID, telefone, R$, data) = Inter tabular-nums ou ui-monospace.

Escala: Display 32/40 Sora700 (KPI grande) · H1 28/36 Sora700 · H2 22/28 Sora600 · H3 18/24 Sora600 · Body 14/20 Inter400 · Body medium 14/20 Inter500 · Small 12/16 Inter400 · Micro 11/14 Inter500 uppercase letter-spacing 0.04em (badge, cabeçalho de coluna).

Espaçamento: base 4px, escala 4/8/12/16/24/32/48/64/96. Padding de card 16px mobile / 24px desktop. Sidebar 240px fixo desktop, vira menu inferior/gaveta no mobile.

Raio: sm 6px (botão/input/badge) · md 8px (card) · lg 12px (modal) · full 999px (pill/avatar).

Sombra: mínima. Card = sem sombra, só borda. Dropdown/modal = 0 4px 16px rgba(6,8,12,0.10).

Ícone: linha (outline), 1.5px de traço, 16/20/24px, cor --text-secondary por padrão.

Botão primário: fundo --text-primary (preto), texto branco — NUNCA azul preenchido. Botão secundário: borda --border-default, transparente. Botão destrutivo: borda --red, transparente, texto --red.

Badge: pill (radius full), fundo bem claro da cor + texto forte da mesma cor.

## COMPONENTES A REUTILIZAR/IMPLEMENTAR
Botão · Tabela de leads (Lead ID mono, Nome, Telefone, Estágio badge, Responsável, Última interação relativa, Tags) · Kanban (1 coluna por estágio, drag-and-drop nas transições manuais, setas ◄► no mobile) · Badge de status/tag · Badge de urgência de follow-up (atrasado=vermelho pulsando+⚠️, hoje=âmbar+🔔, agendado=azul+📅) · Card de KPI · Campo de formulário · Modal · Sidebar · Toast · Filtro/busca · Avatar · Ações de contato rápido: ligar (`tel:0{DDD}{numero}`), WhatsApp (`wa.me/55{numero}` com mensagem pré-preenchida), copiar com feedback "Copiado ✓", QR code pra discar.

## MODELO DE DADOS (12 entidades — já existem no backend, use estes nomes de campo exatos)

- **Marca** — marcaId, nome, status, criadoEm
- **Produto** — produtoId, marcaId, nome, precosPadrao[250,380,500], status
- **Operação** (entidade — não confundir com o PAPEL "Gestor da operação") — operacaoId, produtoId, marcaId, nome, status
- **Célula** — celulaId, operacaoId, status, metaDisparosDia(500), dataAbertura, equipe (2 V1 + 5 V2 + 1 Ajustador + 1 Gestor da operação)
- **Bloco** — blocoId, tamanho(100/500/1000/10000), blocoPaiId, celulaId, responsavelId, status, leadsCount, leadsTrabalhadosCount
- **Contato** (= "DNA do lead") — contatoId, telefone, nomeNegocioMaisRecente, leadsHistorico[], jaComprouAlgumaVez, primeiraAbordagemEm, ultimaAbordagemEm, tagsAcumuladas
- **Lead** — leadId (`LEAD-0000001`), nomeNegocio, telefone, endereco, nicho, cidade, origem, blocoId, celulaId, operacaoId, contatoId, estagioAtual, responsavelAtual, dataDisparo, dataUltimaInteracao, proximoFollowupEm, tags[], valorProposto, criadoEm
- **Usuário** — usuarioId, nome, papel, celulaId, blocoId, ativo
- **Venda** — vendaId, leadId, fechadoPor, valor, comissaoPercentual (15% v1/30% v2), comissaoValor, formaPagamento, statusPagamento, pedidoAjuste, dataVenda
- **Interação** — interacaoId, leadId, tipo(disparo/resposta/ligacao/mensagem_v1/ajuste/nota), resultadoLigacao, autorId, timestamp, conteudo
- **Tag** — tagId, leadId, tipo, valor
- **TagConfig** (catálogo customizável) — tagConfigId, categoria, label, cor, ativo

## PIPELINE — 13 estágios (fixo, nesta ordem)
`novo` → `disparado` → `entregue` → `nao_respondeu` → `respondeu` → `interessado` → `em_negociacao_v1` → `fila_v2` → `em_ligacao_v2` → `vendido` → `em_ajuste` → `entregue_final` → `perdido`

Regra D0-D2/D3+: dias 0-2 desde o disparo = fila compartilhada dos 2 V1; a partir do dia 3 sem resposta = `fila_v2`, responsável = V2 dono do bloco. "O lead pertence à etapa, não à pessoa."

Comissão: 15% se V1 fechou, 30% se V2 fechou.

## PERMISSÕES relevantes pro Gestor da operação
Vê e edita TUDO da própria célula (leads, kanban, equipe, vendas, comissão dos vendedores da célula, tags). NÃO vê nada de outra célula. NÃO vê KPI cross-célula/operação geral. NÃO gerencia usuários fora da própria célula, NÃO abre célula nova, NÃO gerencia Marca/Produto/Operação. Pode gerenciar catálogo de tags customizáveis, mas só as de uso na própria célula. Pode ver DNA completo do lead (histórico cross-operação), mas só a partir de leads da própria célula.

## O QUE NÃO ENTRA EM NENHUMA TELA (decisão fechada, não pergunte, não sugira alternativa)
- Nenhuma feature de IA/machine learning
- Nenhum ranking ou visibilidade de desempenho entre vendedores de células diferentes
- Nenhum papel "Auditor"
- Nenhuma integração automática de pagamento
- Nenhum chat embutido no CRM

## ESTADOS DE TELA (obrigatório prever os 5 em toda tela)
1. Vazio — ícone + mensagem + ação sugerida quando fizer sentido
2. Carregando — skeleton no formato da linha/card real
3. Erro — tela inteira: ícone + "Não deu pra carregar agora." + "Tentar de novo"; ação pontual: toast vermelho
4. Sucesso — toast verde 4s ou card de KPI muda de cor
5. Parcial — meio do dia, KPI não fica vermelho antes de ~14h (estado neutro "em andamento")

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas, não invente novas)

Base: `/api`

```
POST /api/auth/login   body {email, senha} → {token, usuario}
GET  /api/auth/me

GET   /api/celulas/:id
PATCH /api/celulas/:id
GET   /api/celulas/:id/kpis   → {vendasHoje, vendasHojeV1, vendasHojeV2, conversao, cac, nivel}

GET /api/blocos?celulaId=&responsavelId=&status=

GET   /api/leads?celulaId=&estagio=&responsavelId=&tag=&busca=
GET   /api/leads/:id
PATCH /api/leads/:id
GET   /api/leads/:id/dna       → {contato, leadsHistorico:[]}
GET   /api/leads/:id/interacoes
POST  /api/leads/:id/interacoes

POST /api/vendas
GET  /api/vendas?celulaId=&usuarioId=&periodo=

GET    /api/usuarios?celulaId=
PATCH  /api/usuarios/:id

GET   /api/tag-config?categoria=
POST  /api/tag-config
PATCH /api/tag-config/:id
POST  /api/leads/:id/tags

GET   /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida

POST /api/relatorios-diarios
GET  /api/relatorios-diarios?celulaId=

GET /api/export/leads.csv?celulaId=    (UTF-8 BOM, separador ;)
GET /api/export/vendas.csv?celulaId=
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Gestor da operação (= Gestor de célula)

Cuida da equipe de UMA célula (V1/V2/Ajustador). Vê tudo da própria célula, nada de outra.

**Tela principal ao logar:** Dashboard da própria célula

**Menu lateral:**
1. Dashboard da célula (home)
2. Pipeline (kanban de todos os leads da célula)
3. Equipe (V1, V2, Ajustador da célula)
4. Vendas da célula
5. Relatório diário/semanal

**Dashboard da célula**
- Cards de KPI: vendas hoje (V1 + V2 separado), conversão da célula, CAC, comparação com mínimo/ideal/desejável (semáforo)
- Por vendedor: mini-card de cada V1/V2 — nome, vendas hoje, se bateu o mínimo individual (✅/❌)
- Gráfico de tendência (7 dias) da célula

**Pipeline (kanban)**
- Kanban completo dos leads da célula, todas as colunas de estágio
- Filtro por V1/V2/Ajustador responsável
- Clique no card abre o lead (detalhe + histórico de interação + botão "Ver DNA completo")

**Equipe**
- Lista da equipe da célula: papel, nome, meta individual, performance do dia/semana
- Ação: dar feedback (campo de nota, vira registro histórico ligado à pessoa)

**Vendas da célula**
- Tabela de vendas, quem fechou, valor, comissão; total de comissão paga no período

**Relatório diário/semanal**
- Formulário do checklist diário dentro do sistema — preenche e envia com 1 clique

**Notificações que recebe:** vendedor abaixo do mínimo individual no dia · bloco de V2 sem atividade · lead parado há mais de X dias sem interação

**Copy literal:** "Salvar" · "Cancelar" · "Ver detalhes" · "Ver DNA completo" · "Enviar relatório"; alertas de KPI "Abaixo do mínimo hoje — faltam [N] vendas." / "Batendo o ideal. Segue assim." / "Nível desejável! 🎯"; badges de urgência "Atrasado" / "Hoje" / "Agendado — [data]"; DNA "Já abordado antes — [data]".

Construa: as telas acima com os 5 estados previstos, consumindo o contrato de API, com o design system aplicado. Não crie backend, não crie schema, não reimplemente autenticação.
