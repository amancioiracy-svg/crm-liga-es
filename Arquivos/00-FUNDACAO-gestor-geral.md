# PROMPT 1/7 — FUNDAÇÃO: Backend completo + Design System + Gestor geral

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio. Esta é a peça que constrói o backend inteiro — rode ela primeiro, sempre.

---

## CONTEXTO DO PRODUTO

Você vai construir um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis/usuários diferentes, cada um com sua própria área. Este é o prompt de FUNDAÇÃO: você vai construir o backend inteiro (banco de dados, autenticação, todas as rotas de API) mais a base visual compartilhada, mais a área do Gestor geral. As outras 6 áreas (Gestor da operação, Gestor de disparo, Operador, Ajustador, V1, V2) estão sendo construídas em conversas separadas e vão consumir exatamente a API que você criar aqui — por isso é ESSENCIAL seguir o contrato de API abaixo à risca, sem renomear rota, sem mudar formato de resposta.

## STACK TÉCNICA (fixa)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + PostgreSQL (`pg`), pensado pra rodar no Railway — SEM Supabase, sem nenhum BaaS. Auth e permissão implementadas na própria aplicação.
- Fallback gracioso: se `DATABASE_URL` não estiver configurado ou o Postgres cair, o sistema deve continuar rodando com armazenamento em memória em vez de derrubar tudo — nunca perder o registro de uma venda por falha de infraestrutura.
- Autenticação: login individual por usuário (não conta compartilhada por papel), sessão longa, token simples (JWT ou sessão — sua escolha de implementação).
- Sem nenhuma biblioteca ou serviço de IA/machine learning em nenhuma parte do sistema — isso é regra fixa, não "ainda não".

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

Botão primário: fundo --text-primary (preto), texto branco — NUNCA azul preenchido (azul é só link/foco). Botão secundário: borda --border-default, transparente. Botão destrutivo: borda --red, transparente, texto --red.

Badge: pill (radius full), fundo bem claro da cor + texto forte da mesma cor (nunca cor sólida forte de fundo).

## COMPONENTES COMPARTILHADOS (construa estes primeiro, reutilizáveis)
Botão (primário/secundário/destrutivo/texto, com estados normal/hover/desabilitado/carregando) · Tabela de leads (colunas: Lead ID mono, Nome, Telefone, Estágio badge, Responsável, Última interação relativa, Tags; ordenável, filtrável, hover) · Kanban (1 coluna por estágio, drag-and-drop nas transições manuais, setas ◄► como alternativa no mobile, contador por coluna) · Badge de status/tag (cores por estágio/temperatura, ver mapa no design system) · Badge de urgência de follow-up (atrasado=vermelho pulsando+⚠️, hoje=âmbar+🔔, agendado=azul+📅) · Card de KPI (número grande + label + meta/variação com cor semáforo) · Campo de formulário (label acima, erro abaixo em vermelho) · Modal/dialog · Sidebar (240px desktop, vira barra inferior/gaveta mobile) · Toast (canto superior direito, 4s) · Filtro/busca (chip clicável) · Avatar (iniciais, cor consistente por pessoa) · Ações de contato rápido: ligar (`tel:0{DDD}{numero}`, o 0 antes do DDD é obrigatório), WhatsApp (`wa.me/55{numero}` com mensagem pré-preenchida citando o link do site), copiar telefone/link (feedback "Copiado ✓" por 2s, sem toast), QR code pra discar (mesmo `tel:0...`).

## MODELO DE DADOS (12 entidades — implemente exatamente estes campos, sem renomear)

- **Marca** — marcaId, nome, status(ativa/pausada), criadoEm
- **Produto** — produtoId, marcaId, nome, precosPadrao[250,380,500], status(ativo/pausado)
- **Operação** (entidade — não confundir com o PAPEL "Gestor da operação", que é outra coisa) — operacaoId, produtoId, marcaId, nome, status(ativa/pausada/encerrada)
- **Célula** — celulaId, operacaoId, status(ativa/pausada/encerrada), metaDisparosDia(padrão 500), dataAbertura, equipe (2 V1 + 5 V2 + 1 Ajustador + 1 Gestor da operação)
- **Bloco** — blocoId, tamanho(100/500/1000/10000), blocoPaiId, celulaId, responsavelId (só blocos de 100 têm V2 fixo), status(aberto/em_trabalho/esgotado), leadsCount (calculado), leadsTrabalhadosCount (calculado)
- **Contato** (= "DNA do lead") — contatoId (gerado do telefone normalizado — chave de deduplicação), telefone, nomeNegocioMaisRecente, leadsHistorico[] (todas as abordagens, cross-operação), jaComprouAlgumaVez (calculado), primeiraAbordagemEm (calculado), ultimaAbordagemEm (calculado), tagsAcumuladas (opt-out em qualquer abordagem bloqueia todas as futuras, cross-operação)
- **Lead** — leadId (formato `LEAD-0000001`, sequencial, nunca editável), nomeNegocio, telefone (E.164), endereco, nicho, cidade, origem(google_maps/indicacao/outro), blocoId, celulaId (derivado do bloco), operacaoId (derivado da célula), contatoId (vincula ao DNA pelo telefone), estagioAtual, responsavelAtual, dataDisparo, dataUltimaInteracao, proximoFollowupEm (alimenta badge de urgência), tags[], valorProposto(250/380/500), criadoEm
- **Usuário** — usuarioId, nome, papel(gestor_geral/gestor_operacao/gestor_disparo/operador/ajustador/v1/v2), celulaId (nulo pra gestor_geral e gestor_disparo — são cross-célula), blocoId (só v2), ativo
- **Venda** — vendaId, leadId, fechadoPor (usuário v1 ou v2), valor(250/380/500), comissaoPercentual (calculado: 15% se v1, 30% se v2), comissaoValor (calculado), formaPagamento(pix/transferencia/debito), statusPagamento(pendente/confirmado), pedidoAjuste (texto livre, opcional), dataVenda
- **Interação** — interacaoId, leadId, tipo(disparo/resposta/ligacao/mensagem_v1/ajuste/nota), resultadoLigacao (referência TagConfig, só quando tipo=ligacao), autorId (nulo se automático), timestamp, conteudo (texto livre)
- **Tag** — tagId, leadId, tipo(motivo_objecao/temperatura/opt_out/origem_extra), valor (conforme tipo: motivo_objecao → caro/precisa_pensar/tem_site/sem_interesse; temperatura → quente/morno/frio)
- **TagConfig** (catálogo customizável) — tagConfigId, categoria(motivo_objecao/temperatura/opt_out/origem_extra/resultado_ligacao), label, cor(hex), ativo, gerenciado por gestor_geral e gestor_operacao

Hoje existe só 1 registro de Marca ("nyroh"), 1 de Produto ("site") e 1 de Operação ("operacao-sites") — semeie esses 3 registros por padrão na criação do banco. A estrutura já nasce pronta pra quando existir mais de uma marca/produto rodando.

## PIPELINE — 13 estágios (fixo, nesta ordem, não renomeie)
`novo` → `disparado` → `entregue` → `nao_respondeu` → `respondeu` → `interessado` → `em_negociacao_v1` → `fila_v2` → `em_ligacao_v2` → `vendido` → `em_ajuste` → `entregue_final` → `perdido`

Regra automática por tempo (D0-D2 / D3+):
- Dias 0-2 desde `dataDisparo`: lead pertence à fila COMPARTILHADA dos 2 V1 da célula (qualquer um pode atender)
- A partir do dia 3, se nunca respondeu: `estagioAtual = fila_v2`, `responsavelAtual` = V2 dono do bloco daquele lead
- Regra de ouro: "o lead pertence à etapa, não à pessoa" — se responder tarde já na fila do V2, a venda que sair daqui é do V2

Regra de venda → comissão: 15% se `fechadoPor.papel == v1`, 30% se `== v2`, sobre o valor da venda. Ao criar uma Venda, o lead muda pra `em_ajuste` automaticamente.

Regra de DNA/Contato: ao criar um Lead, normalize o telefone e busque/crie o Contato correspondente. Se qualquer Lead do histórico desse Contato tem tag `opt_out = true`, nenhum lead novo desse Contato pode entrar em disparo/ligação — regra vale cross-operação.

## PERMISSÕES (matriz completa — implemente no backend, não só esconda no frontend)
| Ação | Gestor geral | Gestor operação | Gestor disparo | Operador | Ajustador | V1 | V2 |
|---|---|---|---|---|---|---|---|
| Ver leads de todas as células | ✅ | ❌ | 👁 só disparo | ❌ | ❌ | ❌ | ❌ |
| Ver leads da própria célula | ✅ | ✅ | 👁 | ❌ | 🔒 só em ajuste | 🔒 fila dele | 🔒 bloco dele |
| Editar lead / mover estágio manual | ✅ | ✅ | ❌ | ❌ | 🔒 status ajuste | 🔒 próprio | 🔒 próprio |
| Registrar venda | ✅ | ✅ | ❌ | ❌ | ❌ | 🔒 próprio | 🔒 próprio |
| Ver comissão de outros vendedores | ❌ pra todos exceto ✅ Gestor geral/operação | | | | | | |
| Ver KPI cross-célula (operação geral) | ✅ | ❌ | 👁 só disparo | ❌ | ❌ | ❌ | ❌ |
| Ver DNA completo do lead | ✅ | ✅ própria célula | ❌ | ❌ | ❌ | 👁 resumo | 👁 resumo |
| Ver Torre de Controle | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar Marca/Produto/Operação | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar catálogo de tags | ✅ | ✅ própria célula | ❌ | ❌ | ❌ | ❌ | ❌ |
| Abrir célula nova / gerenciar usuários | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Criar/editar template de disparo | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Entregar bloco de leads pro disparo | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

## O QUE NÃO ENTRA EM NENHUMA TELA (decisão fechada, não pergunte, não sugira alternativa)
- Nenhuma feature de IA/machine learning em lugar nenhum do sistema
- Nenhum ranking ou visibilidade de desempenho entre vendedores (V1/V2 nunca veem a performance um do outro)
- Nenhum papel "Auditor"
- Nenhuma integração automática de pagamento (confirmação é sempre manual)
- Nenhum chat embutido no CRM (a conversa real acontece no WhatsApp de fora, o CRM só registra o resultado)

## ESTADOS DE TELA (obrigatório prever os 5 em toda tela que construir)
1. Vazio — ícone simples + mensagem explicando + ação sugerida quando fizer sentido
2. Carregando — skeleton no formato da linha/card real, nunca spinner central genérico
3. Erro — tela inteira: ícone + "Não deu pra carregar agora." + botão "Tentar de novo"; erro de ação pontual: toast vermelho, sem perder o que a pessoa tava fazendo; erro de validação: aparece embaixo do campo específico
4. Sucesso — toast verde que some em 4s (ação pontual) ou o próprio card de KPI muda de cor quando a meta é batida
5. Parcial — no meio do dia, KPI de meta nunca vermelho antes de ~14h — usar estado neutro "em andamento" até um horário de corte

## CONTRATO DE API (implemente exatamente estas rotas — as outras 6 peças do sistema vão consumir elas)

Base: `/api`

**Autenticação**
```
POST /api/auth/login   body {email, senha} → {token, usuario:{usuarioId,nome,papel,celulaId,blocoId}}
GET  /api/auth/me      → {usuario}
POST /api/auth/logout
```

**Usuários**
```
GET    /api/usuarios?papel=&celulaId=
POST   /api/usuarios
PATCH  /api/usuarios/:id
DELETE /api/usuarios/:id   (desativa, não apaga)
```

**Marca / Produto / Operação**
```
GET  /api/marcas
POST /api/marcas
GET  /api/produtos?marcaId=
POST /api/produtos
GET  /api/operacoes?produtoId=
POST /api/operacoes
```

**Células**
```
GET   /api/celulas?operacaoId=&status=
GET   /api/celulas/:id
POST  /api/celulas
PATCH /api/celulas/:id
GET   /api/celulas/:id/kpis   → {vendasHoje, vendasHojeV1, vendasHojeV2, conversao, cac, nivel: "minimo"|"ideal"|"desejavel"}
```

**Blocos**
```
GET /api/blocos?celulaId=&responsavelId=&status=
GET /api/blocos/:id
```

**Leads**
```
GET   /api/leads?celulaId=&estagio=&responsavelId=&tag=&busca=
GET   /api/leads/:id
PATCH /api/leads/:id                (mudar estagioAtual manual, tags, proximoFollowupEm)
POST  /api/leads/import-zip         (multipart — Operador entrega bloco, ZIP com JSON aninhado)
GET   /api/leads/:id/dna            → {contato, leadsHistorico:[]}
GET   /api/leads/:id/interacoes
POST  /api/leads/:id/interacoes     (registrar ligação/mensagem/nota, incluindo resultadoLigacao)
```

**Vendas**
```
POST /api/vendas                    (cria venda, calcula comissão automático, move lead pra em_ajuste)
GET  /api/vendas?celulaId=&usuarioId=&periodo=
GET  /api/vendas/:id
```

**Tags / catálogo**
```
GET   /api/tag-config?categoria=
POST  /api/tag-config
PATCH /api/tag-config/:id
POST  /api/leads/:id/tags
```

**Notificações**
```
GET   /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida
```

**Disparo**
```
POST /api/webhooks/disparo          (entrada — confirmação de entrega/leitura/resposta da API oficial WhatsApp)
GET  /api/disparo/saude?celulaId=
GET  /api/disparo/templates
POST /api/disparo/templates
```

**KPIs e status**
```
GET /api/kpis/celula/:id
GET /api/kpis/operacao-geral
GET /api/kpis/usuario/:id
GET /api/torre-controle             → status ao vivo por célula: [{celulaId, indicador: "verde"|"amarelo"|"vermelho", quemLogado:[], ultimaAcaoHaQuanto, vendasHojeAoVivo}]
```

**Relatório diário**
```
POST /api/relatorios-diarios
GET  /api/relatorios-diarios?celulaId=
```

**Exportação**
```
GET /api/export/leads.csv?celulaId=    (UTF-8 com BOM, separador ;)
GET /api/export/vendas.csv?celulaId=
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Gestor geral (Thomas)

Ele é o dono da operação inteira — controle de qualidade e estratégia, acesso 100% irrestrito, cross-célula e cross-operação.

**Tela principal ao logar:** Dashboard geral

**Menu lateral:**
1. Dashboard geral (home)
2. Torre de Controle
3. Células (lista → drill-down em cada uma)
4. Todos os leads (busca cross-célula)
5. Vendas (todas, filtrável)
6. Equipe (todos os usuários, todos os papéis)
7. Saúde do disparo (visão cross-célula)
8. Configurações

**Dashboard geral**
- Topo: cards de KPI somando todas as células ativas — disparos hoje, vendas hoje, conversão, CAC, lucro estimado (semáforo verde/âmbar/vermelho)
- Tabela: 1 linha por célula ativa — nome, vendas hoje, conversão, CAC, status, link pra abrir
- Gráfico de tendência de conversão 7/30 dias, por célula sobreposta
- Alerta no topo se algum CAC estourou o teto (R$100) ou alguma célula tá abaixo do mínimo há 3+ dias

**Torre de Controle** (diferente do Dashboard — aqui é status AO VIVO, não número/tendência)
- 1 card por célula ativa: indicador 🟢 rodando normal / 🟡 atenção / 🔴 parado ou abaixo do mínimo agora
- Por card: quem tá logado agora, última ação registrada há quanto tempo, vendas do dia em tempo real
- Clique no card leva pro drill-down da célula
- Atualiza sozinho (poll a cada X segundos ou websocket)

**Tela Célula (drill-down)**
- Mesmo conteúdo que o Gestor da operação vê (KPI 3 camadas, kanban da célula, equipe, vendas) — mas o Gestor geral pode entrar em qualquer célula

**Todos os leads**
- Tabela com filtro por célula, estágio, responsável, tag; busca por Lead ID, nome, telefone
- Clique num lead → botão "Ver DNA completo": abre o histórico do Contato (todas as abordagens, cross-célula/operação, com data e resultado de cada uma); se já comprou antes, aviso destacado no topo

**Vendas**
- Tabela de todas as vendas, filtrável por célula/vendedor/período; total de comissão paga e faturamento

**Equipe**
- Lista de todos os usuários, todos os papéis, célula vinculada; ação: criar usuário, desativar, trocar papel/célula

**Saúde do disparo**
- Por célula: quality rating, templates ativos/rejeitados, custo do dia; alerta se categoria do template mudou

**Configurações**
- Abrir célula nova, gerenciar usuário
- Marca/Produto/Operação: hoje só 1 registro de cada, tela pronta pra cadastrar mais
- Catálogo de tags customizáveis: criar/editar/desativar tag com label e cor própria

**Notificações que recebe:** CAC estourando teto · célula abaixo do mínimo 3+ dias · quality rating caindo · solicitação de abertura de célula nova

**Copy literal a usar:** botões "Salvar" · "Cancelar" · "Ver detalhes" · "Ver DNA completo"; alertas de KPI "Abaixo do mínimo hoje — faltam [N] vendas." / "Batendo o ideal. Segue assim." / "Nível desejável! 🎯" / "CAC acima do teto (R$100) — atenção ao custo por venda."; badges Torre de Controle "Rodando normal" / "Atenção" / "Parado"; DNA "Já abordado antes — [data]" / "Esse negócio já comprou antes ([data])".

Construa: backend completo (schema + migrations + seed dos 3 registros padrão de Marca/Produto/Operação + todas as rotas do contrato acima + autenticação), os componentes compartilhados do design system, e todas as telas do Gestor geral listadas acima, com os 5 estados previstos em cada uma.
