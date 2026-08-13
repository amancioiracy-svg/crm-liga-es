# PROMPT 4/7 — Operador

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

Espaçamento base 4px (4/8/12/16/24/32/48/64/96). Raio: sm 6px · md 8px · lg 12px · full 999px. Sombra mínima, card sem sombra. Ícone linha 1.5px. Botão primário fundo preto/texto branco.

## COMPONENTES A REUTILIZAR/IMPLEMENTAR
Botão · Tabela simples · Card de KPI · Sidebar · Toast.

## MODELO DE DADOS RELEVANTE
- **Bloco** — blocoId, tamanho, celulaId, status(aberto/em_trabalho/esgotado), leadsCount, leadsTrabalhadosCount
- **Lead** (campos de validação) — leadId, nomeNegocio, telefone, endereco, estagioAtual=`novo` quando entregue

## PERMISSÕES relevantes pro Operador
**Escopo mínimo, proposital.** Não acessa pipeline de venda, não vê estágio de venda, não vê lead individual além da validação técnica (telefone válido, endereço completo). Só entrega blocos — é integração, não login com telas de pipeline completo.

## O QUE NÃO ENTRA EM NENHUMA TELA
- Nenhuma feature de IA/machine learning
- Nenhuma integração automática de pagamento
- Nenhum chat embutido

## ESTADOS DE TELA (obrigatório prever)
1. Vazio · 2. Carregando (skeleton) · 3. Erro (ícone + "Não deu pra carregar agora." + "Tentar de novo") · 4. Sucesso (toast verde 4s) · 5. Parcial

## CONTRATO DE API (já existe no backend — consuma exatamente estas rotas)

Base: `/api`

```
POST /api/auth/login
GET  /api/auth/me

GET  /api/blocos?celulaId=&responsavelId=&status=
POST /api/leads/import-zip     (multipart — entrega bloco de leads validados, ZIP com JSON aninhado)

GET /api/notificacoes?usuarioId=&lida=
```

---

## SUA TAREFA ESPECÍFICA: construir a área do Operador

**Escopo reduzido de propósito.** O Operador não faz parte do CRM de vendas como usuário de pipeline — ele já tem o próprio sistema completo de criação/publicação de site fora daqui. O CRM só precisa mostrar que o bloco foi recebido do lado do disparo, sem duplicar nada do sistema de criação.

**Menu lateral (mínimo):**
1. Meus blocos entregues hoje
2. Status de validação

**Meus blocos entregues hoje**
- Lista simples: bloco criado, quantidade de leads, status (entregue pro disparo / aguardando)
- Sem acesso a estágio de venda, sem acesso a lead individual além da validação técnica (telefone válido, endereço completo)
- Ação: entregar novo bloco (upload de ZIP, ver contrato de import)

**Status de validação**
- Card simples: leads puxados hoje / validados / taxa (meta 70-80%)

**Notificações que recebe:** nenhuma notificação específica documentada — telas simples, sem alerta.

**Copy literal:** "Salvar" · "Cancelar".

Construa: as 2 telas acima com os 5 estados previstos, o mais simples e direto possível — é o papel com menos superfície de UI de todo o sistema. Não crie backend, não crie schema, não reimplemente autenticação.
