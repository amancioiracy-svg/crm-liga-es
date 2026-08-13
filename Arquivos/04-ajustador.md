# PROMPT 5/7 — Ajustador

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio (separada da fundação). Rode o prompt `00-FUNDACAO-gestor-geral.md` primeiro, em outra conversa — o backend já existe, aqui você só constrói frontend.

---

## CONTEXTO DO PRODUTO

Você vai construir uma PEÇA de um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis, cada um com sua própria área, sendo construídos em conversas SEPARADAS do Google AI Studio pra depois serem unidos num código só. **Este prompt NÃO é o de fundação** — o backend inteiro já foi definido e construído em outra peça. Aqui você constrói SÓ o frontend das telas do papel indicado em "SUA TAREFA ESPECÍFICA", consumindo exatamente o contrato de API abaixo. NÃO crie schema de banco novo, NÃO invente rotas novas, NÃO reimplemente autenticação.

Como esta conversa é isolada, implemente os componentes de UI que precisar seguindo à risca os tokens do design system abaixo, pra ficar visualmente idêntico às outras peças.

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

Tipografia: título Sora 600-800, texto Inter 400-600, dado numérico Inter tabular-nums. Escala: H1 28/36 Sora700 · H2 22/28 Sora600 · Body 14/20 Inter400 · Small 12/16 · Micro 11/14 uppercase.

Espaçamento base 4px (4/8/12/16/24/32/48/64/96). Raio: sm 6px · md 8px · lg 12px · full 999px. Sombra mínima. Ícone linha 1.5px. Botão primário fundo preto/texto branco.

## COMPONENTES A REUTILIZAR/IMPLEMENTAR
Botão · Tabela/lista · Card de KPI · Modal de confirmação · Sidebar · Toast.

## MODELO DE DADOS RELEVANTE
- **Lead** — leadId, nomeNegocio, estagioAtual(`em_ajuste`→`entregue_final`), responsavelAtual
- **Venda** — vendaId, leadId, fechadoPor, pedidoAjuste (o que o cliente pediu, texto livre), dataVenda
- **Interação** — tipo=`ajuste`, timestamp, conteudo

## PIPELINE — estágios que este papel movimenta
`em_ajuste` (automático, ao criar Venda) → `entregue_final` (manual, Ajustador marca como publicado)

## PERMISSÕES relevantes pro Ajustador
Só vê leads no próprio estágio de ajuste atribuídos (`em_ajuste`). Pode editar status de ajuste e mover `em_ajuste` → `entregue_final`. Vê a própria comissão/valor por ajuste (R$10 cada). NÃO vê comissão de vendedores, NÃO vê KPI da célula, NÃO acessa leads fora da fila de ajuste dele.

## O QUE NÃO ENTRA EM NENHUMA TELA
- Nenhuma feature de IA/machine learning
- Nenhum ranking entre vendedores
- Nenhuma integração automática de pagamento
- Nenhum chat embutido

## ESTADOS DE TELA (obrigatório prever)
1. Vazio ("Nenhum ajuste pendente. Bom trabalho.") · 2. Carregando (skeleton) · 3. Erro (ícone + "Não deu pra carregar agora." + "Tentar de novo") · 4. Sucesso (toast verde 4s: "Marcado como entregue. Bom trabalho!") · 5. Parcial

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas)

Base: `/api`

```
POST /api/auth/login
GET  /api/auth/me

GET   /api/leads?estagio=em_ajuste&responsavelId=
GET   /api/leads/:id
PATCH /api/leads/:id              (mover pra entregue_final)
GET   /api/leads/:id/interacoes
POST  /api/leads/:id/interacoes   (tipo=ajuste)

GET /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Ajustador

Pós-venda — recebe a venda fechada, ajusta o site (fora do CRM, no sistema de site), publica, confirma entrega dentro do CRM.

**Tela principal ao logar:** Fila de ajustes

**Menu lateral:**
1. Fila de ajustes (home)
2. Concluídos (histórico)

**Fila de ajustes**
- Lista de leads no estágio `em_ajuste`, ordenada por data da venda (mais antigo primeiro)
- Cada item: nome do negócio, o que o cliente pediu (`pedidoAjuste`), quem vendeu (V1/V2), quando fechou
- Ação por item: "Marcar como publicado" → modal de confirmação (checkbox "cliente confirmou") → move lead pra `entregue_final`
- Card de contador: quantos ajustes feitos hoje, valor a receber (R$10 × ajustes)

**Concluídos**
- Histórico dos ajustes já entregues, com data de entrega e tempo entre venda e entrega

**Notificações que recebe:** nova venda entrou na fila dele · fila com item parado há mais de 24h sem ação

**Copy literal:** "Marcar como publicado" · "Salvar" · "Cancelar"; estado vazio "Nenhum ajuste pendente. Bom trabalho."; sucesso "Marcado como entregue. Bom trabalho!"; confirmação título "Marcar como entregue?" corpo "Confirma que o cliente já validou o site publicado?" botões "Cancelar"/"Confirmar".

Construa: as 2 telas acima com os 5 estados previstos, consumindo o contrato de API, design system aplicado. Não crie backend, não crie schema, não reimplemente autenticação.
