# PROMPT 7/7 — Vendedor 2 (V2)

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio (separada da fundação). Rode o prompt `00-FUNDACAO-gestor-geral.md` primeiro, em outra conversa — o backend já existe, aqui você só constrói frontend.

---

## CONTEXTO DO PRODUTO

Você vai construir uma PEÇA de um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis, cada um com sua própria área, sendo construídos em conversas SEPARADAS do Google AI Studio pra depois serem unidos num código só. **Este prompt NÃO é o de fundação** — o backend inteiro já foi definido e construído em outra peça. Aqui você constrói SÓ o frontend das telas do papel indicado em "SUA TAREFA ESPECÍFICA", consumindo exatamente o contrato de API abaixo. NÃO crie schema de banco novo, NÃO invente rotas novas, NÃO reimplemente autenticação.

Como esta conversa é isolada, implemente os componentes de UI que precisar seguindo à risca os tokens do design system abaixo, pra ficar visualmente idêntico às outras peças.

**Importante pra este papel:** V2 vive no CELULAR, ligando de qualquer lugar, com internet às vezes instável. Mobile-first é obrigatório, e nenhuma ação pode se perder por falha de conexão.

## STACK TÉCNICA (fixa)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend (já existe, não recriar): Node.js + Express + PostgreSQL, Railway — SEM Supabase
- Sem nenhuma feature de IA/machine learning em nenhuma parte do sistema

## DESIGN SYSTEM (fixo)

Referência visual: Vercel. **SEMPRE tema claro.**

Cor:
| Token | Hex | Uso |
|---|---|---|
| --bg-base | #FFFFFF | fundo geral |
| --bg-subtle | #FAFAFA | painel secundário |
| --bg-hover | #F2F4F7 | hover |
| --border-default | #E4E9F0 | borda padrão |
| --text-primary | #06080C | texto principal |
| --text-secondary | #5B6472 | texto de apoio |
| --blue | #3C82FF | interativo |
| --green | #22E081 | só sucesso |
| --amber | #E8A33D | atenção |
| --red | #EF4444 | erro/crítico |

Tipografia: título Sora 600-800, texto Inter 400-600, dado numérico Inter tabular-nums. Escala: Display 32/40 Sora700 (KPI grande) · H2 22/28 Sora600 · Body 14/20 Inter400 · Small 12/16 · Micro 11/14 uppercase.

Espaçamento base 4px (4/8/12/16/24/32/48/64/96). Área de toque mínima 44px em mobile. Raio: sm 6px · md 8px · lg 12px · full 999px. Sombra mínima. Ícone linha 1.5px. Botão primário fundo preto/texto branco, altura 44px no mobile.

## COMPONENTES A REUTILIZAR/IMPLEMENTAR
Botão (grande, área de toque 44px) · Lista/tabela do bloco · Badge de status/tag · Badge de urgência de follow-up (atrasado=vermelho pulsando+⚠️, hoje=âmbar+🔔, agendado=azul+📅) · Card de KPI · Modal de registro de venda e de ligação · Sidebar (vira menu inferior no mobile) · Toast · Ações de contato rápido: ligar (`tel:0{DDD}{numero}` — o 0 antes do DDD é obrigatório), WhatsApp (`wa.me/55{numero}` com mensagem pré-preenchida citando o link do site), copiar telefone/link com feedback "Copiado ✓", QR code pra discar (útil se ele tá olhando o bloco no tablet/desktop e vai ligar do celular).

## MODELO DE DADOS RELEVANTE
- **Bloco** — blocoId, tamanho(100), celulaId, responsavelId (o próprio V2), status, leadsCount, leadsTrabalhadosCount
- **Lead** — leadId, nomeNegocio, telefone, estagioAtual(`fila_v2`/`em_ligacao_v2`), responsavelAtual, dataUltimaInteracao, proximoFollowupEm, tags[], valorProposto, contatoId
- **Contato** (DNA, versão resumida) — usado só pro aviso "já abordado antes"
- **Venda** — vendaId, leadId, fechadoPor, valor(250/380/500), comissaoPercentual=30%, comissaoValor, formaPagamento, statusPagamento, pedidoAjuste, dataVenda
- **Interação** — tipo=`ligacao`, resultadoLigacao (referência TagConfig: Atendeu/Não atendeu/Caixa postal/Pediu retorno/Ocupado), timestamp, conteudo
- **TagConfig** — catálogo de resultado de ligação (consumir, não gerenciar)

## PIPELINE — estágios que este papel movimenta
`fila_v2` (chegou automaticamente após D3 sem resposta) → `em_ligacao_v2` (manual, após ligar e classificar interessado) → `vendido` (manual, ao registrar venda)

Regra: o bloco é FIXO — 100 leads só dele, não compartilhado com outro V2. "O lead pertence à etapa, não à pessoa": mesmo que o lead responda tarde, se já caiu na fila do V2, a venda é dele.

Comissão: 30% sobre o valor da venda (mais alta que V1 porque o trabalho de ligação é mais custoso).

## PERMISSÕES relevantes pro V2
Só vê e edita o próprio bloco fixo de 100 leads. Pode registrar venda, ligação, marcar interessado/perdido, editar tag do próprio lead. Vê a própria comissão. NÃO vê comissão de outros vendedores, NÃO vê KPI de outro V1/V2, NÃO vê ranking.

## O QUE NÃO ENTRA EM NENHUMA TELA
- Nenhuma feature de IA/machine learning
- **Nenhum ranking ou visibilidade de desempenho entre vendedores** — V2 não vê a performance de nenhum outro V1/V2
- Nenhuma integração automática de pagamento
- Nenhum chat embutido no CRM (a conversa/ligação real acontece fora, o CRM só registra o resultado)

## ESTADOS DE TELA (obrigatório prever)
1. Vazio ("Bloco em dia — todo mundo já foi contatado hoje.") · 2. Carregando (skeleton) · 3. Erro (toast vermelho "Não deu pra salvar agora. Tenta de novo em alguns segundos." — a tela por trás continua intacta, não perde o que já foi preenchido) · 4. Sucesso (toast verde: "Venda registrada! R$[valor] — sua comissão: R$[valor]") · 5. Parcial (barra de progresso "X de 100 já contatados" — normal, não é erro)

**Requisito extra deste papel — conectividade instável:** se uma ação (registrar ligação, marcar venda) falhar por falta de conexão, guarde localmente e reenvie quando a conexão voltar. Nunca perder o registro de uma venda por falha de rede — priorize isso na implementação.

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas)

Base: `/api`

```
POST /api/auth/login
GET  /api/auth/me

GET   /api/leads?blocoId=&estagio=&busca=
GET   /api/leads/:id
PATCH /api/leads/:id                 (marcar interessado, mover estágio, editar tag, proximoFollowupEm)
GET   /api/leads/:id/dna             → resumo: {jaAbordadoAntes: bool, ultimaAbordagemEm}
GET   /api/leads/:id/interacoes
POST  /api/leads/:id/interacoes      (tipo=ligacao, resultadoLigacao)

GET  /api/tag-config?categoria=resultado_ligacao

POST /api/vendas                     (registrar venda: valor, formaPagamento, pedidoAjuste)
GET  /api/vendas?usuarioId=&periodo=

GET /api/kpis/usuario/:id            → {vendasHoje, metaMinimaBloco(1), taxaAtendimento(meta 50-70%), conversao7d}

GET /api/blocos/:id                  (o bloco fixo dele)

GET   /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Vendedor 2 (V2)

Liga pra quem NÃO respondeu (a partir de D3), bloco fixo de 100 leads. 5 por célula.

**Tela principal ao logar:** Meu bloco (100 leads fixos)

**Menu lateral:**
1. Meu bloco (home)
2. Minhas vendas
3. Meu desempenho (KPI pessoal)
4. Arsenal (prova social, depoimento, vídeo, institucional — tela simples de galeria de materiais, com botão de compartilhar via WhatsApp)

**Meu bloco**
- Lista dos 100 leads do bloco fixo dele, com filtro por estágio (a ligar / já ligado / interessado / vendido / perdido)
- Cada linha: nome, telefone (clicável pra ligar direto do celular), estágio, última tentativa
- Badge de urgência de follow-up em cada linha: atrasado (vermelho) / hoje (âmbar) / agendado (azul)
- Ações rápidas de contato por linha: ligar (`tel:`), WhatsApp com mensagem pronta, copiar telefone/link, QR pra discar
- Ação rápida por linha: registrar ligação (resultado — Atendeu/Não atendeu/Caixa postal/Pediu retorno/Ocupado), marcar interessado, marcar venda, marcar perdido
- Ao registrar "não atendeu", opção de marcar `proximoFollowupEm` (hoje mais tarde / amanhã / data específica)
- Se o Contato já foi abordado antes (outra operação/produto), aviso discreto: "Já abordado antes — [data]"
- Contador no topo: quantos ainda faltam ligar hoje, quantos já ligou

**Minhas vendas**
- Lista das vendas fechadas por ele, valor, comissão (30%), data

**Meu desempenho**
- Card grande: vendas hoje / meta mínima (1, do bloco dele) — meta individual, clara
- Taxa de atendimento (meta 50-70%)
- Gráfico de conversão dos últimos 7 dias

**Notificações que recebe:** bloco não veio completo hoje · lembrete de retomar ligação não atendida · follow-up atrasado

**Copy literal:** "Marcar interessado" · "Registrar venda" · "Marcar como perdido" · "Ligar" · "Salvar" · "Cancelar" · "Ver detalhes" · "Abrir WhatsApp" · "Copiar" → "Copiado ✓" · "Mostrar QR pra discar"; campo de venda: "Valor da venda" (R$250/380/500), "Forma de pagamento" (PIX/Transferência/Débito), "O que o cliente pediu de ajuste?" (opcional); badges "Atrasado" / "Hoje" / "Agendado — [data]"; erro "Telefone não parece válido — confere o número." / "Não deu pra salvar agora. Tenta de novo em alguns segundos."

Construa: as 4 telas acima com os 5 estados previstos, mobile-first, com atenção especial ao requisito de conectividade instável (guardar e reenviar), consumindo o contrato de API, design system aplicado. Não crie backend, não crie schema, não reimplemente autenticação.
