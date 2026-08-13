# PROMPT 6/7 — Vendedor 1 (V1)

> Copie tudo abaixo pra uma conversa NOVA do Google AI Studio (separada da fundação). Rode o prompt `00-FUNDACAO-gestor-geral.md` primeiro, em outra conversa — o backend já existe, aqui você só constrói frontend.

---

## CONTEXTO DO PRODUTO

Você vai construir uma PEÇA de um CRM de vendas chamado "CRM Nyroh — Operação de Sites". É um sistema interno de uma operação de vendas outbound: leads (comércios locais) recebem disparo de WhatsApp oferecendo um site profissional (R$250/380/500), e um time de vendedores fecha a venda por WhatsApp (V1) ou ligação (V2).

O sistema tem 7 papéis, cada um com sua própria área, sendo construídos em conversas SEPARADAS do Google AI Studio pra depois serem unidos num código só. **Este prompt NÃO é o de fundação** — o backend inteiro já foi definido e construído em outra peça. Aqui você constrói SÓ o frontend das telas do papel indicado em "SUA TAREFA ESPECÍFICA", consumindo exatamente o contrato de API abaixo. NÃO crie schema de banco novo, NÃO invente rotas novas, NÃO reimplemente autenticação.

Como esta conversa é isolada, implemente os componentes de UI que precisar seguindo à risca os tokens do design system abaixo, pra ficar visualmente idêntico às outras peças.

**Importante pra este papel:** V1 vive no CELULAR. Esta é uma das telas onde mobile-first importa mais — o dia inteiro é olhado num celular, no meio de conversas de WhatsApp reais.

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
Botão (grande, área de toque 44px) · Kanban/lista de fila · Badge de status/tag · Badge de urgência de follow-up (atrasado=vermelho pulsando+⚠️, hoje=âmbar+🔔, agendado=azul+📅) · Card de KPI · Modal de registro de venda · Sidebar (vira menu inferior no mobile) · Toast · Ações de contato rápido: WhatsApp (`wa.me/55{numero}` com mensagem pré-preenchida citando o link do site), copiar telefone/link com feedback "Copiado ✓".

## MODELO DE DADOS RELEVANTE
- **Lead** — leadId, nomeNegocio, telefone, estagioAtual(`respondeu`/`interessado`/`em_negociacao_v1`), responsavelAtual, dataUltimaInteracao, tags[], valorProposto, contatoId
- **Contato** (DNA, versão resumida) — usado só pro aviso "já abordado antes"
- **Venda** — vendaId, leadId, fechadoPor, valor(250/380/500), comissaoPercentual=15%, comissaoValor, formaPagamento, statusPagamento, pedidoAjuste, dataVenda
- **Interação** — tipo=`mensagem_v1`, timestamp, conteudo

## PIPELINE — estágios que este papel movimenta
`respondeu` → `interessado` (manual) → `em_negociacao_v1` (manual, após mandar proposta) → `vendido` (manual, ao registrar venda)

Regra: a fila é COMPARTILHADA entre os 2 V1 da célula — mostra todos os leads no estágio, quem atender primeiro assume. Válido só nos dias 0-2 desde o disparo (D0-D2); a partir do dia 3 sem fechar, o lead vira `fila_v2` e sai da tela do V1.

Comissão: 15% sobre o valor da venda.

## PERMISSÕES relevantes pro V1
Só vê e edita a própria fila (leads no estágio dele, fila compartilhada com o outro V1 da célula). Pode registrar venda, marcar interessado/perdido, editar tag do próprio lead. Vê a própria comissão. NÃO vê comissão de outros vendedores, NÃO vê KPI de outro V1/V2, NÃO vê ranking.

## O QUE NÃO ENTRA EM NENHUMA TELA
- Nenhuma feature de IA/machine learning
- **Nenhum ranking ou visibilidade de desempenho entre vendedores** — V1 não vê a performance do outro V1 nem de nenhum V2
- Nenhuma integração automática de pagamento
- Nenhum chat embutido no CRM (a conversa real é no WhatsApp de fora)

## ESTADOS DE TELA (obrigatório prever)
1. Vazio ("Nenhum lead te esperando agora. Assim que alguém responder o disparo, aparece aqui.") · 2. Carregando (skeleton) · 3. Erro (toast vermelho "Não deu pra salvar agora. Tenta de novo em alguns segundos.") · 4. Sucesso (toast verde: "Venda registrada! R$[valor] — sua comissão: R$[valor]") · 5. Parcial (dashboard sem vendas de manhã: "Nenhuma venda ainda hoje — normal nas primeiras horas.")

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas)

Base: `/api`

```
POST /api/auth/login
GET  /api/auth/me

GET   /api/leads?celulaId=&estagio=respondeu,interessado,em_negociacao_v1
GET   /api/leads/:id
PATCH /api/leads/:id                (marcar interessado, mover estágio, editar tag)
GET   /api/leads/:id/dna            → resumo: {jaAbordadoAntes: bool, ultimaAbordagemEm}
GET   /api/leads/:id/interacoes
POST  /api/leads/:id/interacoes     (tipo=mensagem_v1)

POST /api/vendas                    (registrar venda: valor, formaPagamento, pedidoAjuste)
GET  /api/vendas?usuarioId=&periodo=

GET /api/kpis/usuario/:id           → {vendasHoje, metaMinimaTime(5), conversao7d}

GET   /api/notificacoes?usuarioId=&lida=
PATCH /api/notificacoes/:id/lida
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Vendedor 1 (V1)

Fecha quem RESPONDEU ao disparo (janela D0-D2), via WhatsApp. Fixo em 2 por célula, fila compartilhada.

**Tela principal ao logar:** Minha fila (quem respondeu)

**Menu lateral:**
1. Minha fila (home)
2. Minhas vendas
3. Meu desempenho (KPI pessoal)
4. Arsenal (prova social, depoimento, vídeo, institucional — trate como uma tela simples de galeria de materiais, com botão de compartilhar via WhatsApp)

**Minha fila**
- Lista/kanban dos leads no estágio `respondeu`/`interessado`/`em_negociacao_v1` da célula — mostra TODOS (fila compartilhada entre os 2 V1)
- Cada card: nome do negócio, telefone, tempo desde a resposta, última mensagem (preview)
- Se o Contato já foi abordado antes (outra operação/produto), aviso discreto no card: "Já abordado antes — [data]"
- Clique abre o detalhe do lead: histórico de interação + ações rápidas (mandar proposta, marcar interessado, marcar venda, marcar perdido)
- Ações rápidas de contato: WhatsApp com mensagem pronta, copiar telefone/link com feedback visual
- Botão de acesso rápido ao Arsenal dentro do próprio card (mandar prova social/institucional sem sair da tela)

**Minhas vendas**
- Lista das vendas fechadas por ele, valor, comissão (15%), data

**Meu desempenho**
- Card grande: vendas hoje / meta mínima (5, TIME) — deixar claro que é meta do time compartilhada, não individual
- Gráfico de conversão dos últimos 7 dias

**Notificações que recebe:** novo lead respondeu (entra na fila) · lead que ele tá negociando vai virar D3 em breve (aviso de urgência, não perder o timing)

**Copy literal:** "Marcar interessado" · "Registrar venda" · "Marcar como perdido" · "Mandar proposta" · "Salvar" · "Cancelar" · "Ver detalhes" · "Abrir WhatsApp" · "Copiar" → "Copiado ✓"; campo de venda: "Valor da venda" (R$250/380/500), "Forma de pagamento" (PIX/Transferência/Débito), "O que o cliente pediu de ajuste?" (opcional); erro "Telefone não parece válido — confere o número." / "Escolhe o valor da venda antes de confirmar."; confirmação de perdido: título "Marcar lead como perdido?" corpo "Isso tira o lead de qualquer fila ativa. Confirma?".

Construa: as 4 telas acima com os 5 estados previstos, mobile-first (área de toque grande, 1-2 toques por ação), consumindo o contrato de API, design system aplicado. Não crie backend, não crie schema, não reimplemente autenticação.
