# TODO — Coffer

Metodologia: ciclo XP — cada iteração entrega software funcionando e testado.
Fluxo por tarefa: escrever teste → implementar → refatorar → commit.

---

## Iteração 0 — Infraestrutura de testes e tipos base ✅

Objetivo: base técnica sólida antes de qualquer feature.

- [x] Instalar e configurar Vitest + jsdom + React Testing Library
- [x] Configurar script `test` e `test:watch` no `package.json`
- [x] Instalar Zod para validação de input
- [x] Definir tipos TypeScript base: `Currency`, `Category`, `PaymentMethod`, `Expense`, `Income`, `MonthData`
- [x] Definir schemas Zod para cada tipo (validação de input do usuário)
- [x] Testes: schemas Zod com casos válidos e inválidos (boundary values)

---

## Iteração 1 — Camada de criptografia ✅

Objetivo: funções de crypto isoladas, sem UI, 100% testadas.

- [x] Implementar `deriveKey(password, salt)` via PBKDF2 (200k iterações, SHA-256)
- [x] Implementar `generateSalt()` e `generateIV()` aleatórios
- [x] Implementar `encrypt(data, key)` via AES-256-GCM (IV embutido no output)
- [x] Implementar `decrypt(ciphertext, key)` via AES-256-GCM
- [x] Gerar e armazenar separadamente um `verificationToken` criptografado para validar senha no login
- [x] Extrair helpers de encoding (`uint8ArrayToBase64`, `base64ToUint8Array`) para `encoding.ts`
- [x] Testes: encrypt → decrypt round-trip com mesma chave
- [x] Testes: decrypt com chave errada lança erro
- [x] Testes: outputs distintos para mesma entrada (IV aleatório)
- [x] Testes: `verificationToken` válida senha correta e rejeita incorreta

---

## Iteração 2 — Camada de persistência (IndexedDB) ✅

Objetivo: ler e escrever dados criptografados no IndexedDB.

- [x] Helper `openDB()` — inicializa IndexedDB com stores: `settings`, `months`
- [x] Helper `writeSetting(key, value)` — escrita simples (salt e verificationToken em texto plano)
- [x] Helper `readSetting(key)`
- [x] Helper `writeMonth(monthKey, data, key)` — serializa, criptografa e salva
- [x] Helper `readMonth(monthKey, key)` — lê, descriptografa e valida com schema
- [x] Helper `listMonths()` — retorna lista de chaves de meses existentes
- [x] Testes de integração: write/read round-trip com chave correta
- [x] Testes: leitura com chave errada lança erro

---

## Iteração 3 — Autenticação (Setup e Login) ✅

Objetivo: primeiro fluxo visível — abrir o app e autenticar.

- [x] Detectar primeiro acesso (ausência de salt no IndexedDB)
- [x] Tela de Setup: campo senha + confirmação, validação (mínimo 8 chars, senhas iguais)
- [x] Ao confirmar setup: gerar salt, derivar chave, gerar verificationToken, salvar salt + token
- [x] Tela de Login: campo senha, derivar chave, validar via verificationToken
- [x] Context/hook `useSession` — expõe chave derivada em memória; nunca persistida
- [x] Botão de logout — limpa chave da memória e volta para login
- [x] Renderização condicional: Setup / Login / App baseada no estado da sessão
- [x] Testes: componente Setup — validações de senha
- [x] Testes: componente Login — senha correta, incorreta, re-enable após erro
- [x] Testes: `SessionProvider` — ciclo completo: setup → unlock → logout → re-login

---

## Iteração 4 — Despesas (CRUD) ✅

Objetivo: funcionalidade central — registrar e gerenciar despesas do mês.

- [x] Hook `useExpenses(monthKey)` — CRUD sobre IndexedDB com chave de sessão
- [x] Listar despesas agrupadas por categoria: **Fixo** e **Outros**
- [x] Colunas por item: Nome | Moeda | Débito | Cartão de crédito | Fixa
- [x] Formulário inline: adicionar despesa (nome, moeda, valor débito, valor cartão, fixa)
- [x] Editar despesa inline (clique no campo)
- [x] Excluir despesa (com confirmação inline)
- [x] Checkbox "Fixa" por despesa (replica no próximo mês)
- [x] Totais calculados em tempo real por moeda: Total Débito, Total Cartão, Total Geral
- [x] Validação de input via Zod antes de salvar
- [x] Expor `db` no `SessionContext` para uso nos hooks de dados
- [x] Testes: `useExpenses` — add, edit, delete, totais por moeda, validação
- [x] Testes: componente `ExpenseList` — agrupamentos, formulário, delete, edição inline

---

## Iteração 5 — Receitas (CRUD) ✅

Objetivo: registrar de onde vem o dinheiro do mês.

- [x] Hook `useIncomes(monthKey)` — CRUD sobre IndexedDB
- [x] Formulário: adicionar receita (nome/fonte, valor)
- [x] Editar receita inline
- [x] Excluir receita (com confirmação)
- [x] Suporte a múltiplas fontes no mesmo mês
- [x] Total de receitas calculado em tempo real
- [x] Testes: `useIncomes` — add, edit, delete, total

---

## Iteração 6 — Poupança e Sobreajuste ✅

Objetivo: registrar quanto foi guardado e corrigir saldo manualmente.

- [x] Campo de poupança mensal (valor único por mês)
- [x] Campo "Sobreajuste" — correção manual de saldo (ex.: estorno, devolução)
- [x] Hook `useMonthMeta(monthKey)` — lê e salva poupança + ajuste
- [x] Testes: alteração de poupança e ajuste reflete no MonthData salvo

---

## Iteração 7 — Navegação por mês e clonagem de fixas ✅

Objetivo: navegar entre meses e não redigitar despesas fixas.

- [x] Componente `MonthNavigator` — exibe "← Mês Ano →" e navega entre meses
- [x] Ao avançar para mês inexistente: criar novo `MonthData` clonando despesas fixas do anterior
- [x] Ao voltar: carregar mês existente sem alterações
- [x] Hook `useCurrentMonth` — controla mês selecionado e dispara carregamento
- [x] Testes: clonagem copia apenas despesas com `fixa: true`
- [x] Testes: navegar para mês já existente não duplica dados

---

## Iteração 8 — Importação de dados históricos (CSV) ✅

Objetivo: migrar dados da planilha existente para o Coffer.

- [x] Definir e documentar o formato CSV esperado (colunas, separador, encoding)
- [x] Parser `parseCSV(text)` — extrai linhas e mapeia para `MonthData`
- [x] Tela de importação: upload de arquivo, preview tabular dos dados parseados
- [x] Confirmação antes de salvar (sobrescreve mês existente?)
- [x] Salvar dados importados criptografados no IndexedDB
- [x] Testes: parse de CSV válido gera estrutura correta
- [x] Testes: CSV com colunas faltando retorna erro descritivo
- [x] Testes: CSV malformado não salva nada

---

## Iteração 9 — Layout principal e navegação ✅

Objetivo: ligar todos os componentes existentes numa UI navegável e utilizável.

- [x] Layout principal com abas/seções: Expenses | Incomes | Summary
- [x] `MonthNavigator` integrado no topo do layout
- [x] UI de poupança e sobreajuste (campos inline na aba Summary)
- [x] Tela de importação acessível via botão no header
- [x] Botão de logout acessível no header
- [x] Responsivo mobile-first

---

## Iteração 10 — Dashboard (Resumo do mês) ✅

Objetivo: visão consolidada do mês — entregue junto com o layout.

- [x] Card: Receitas totais
- [x] Card: Total Débito
- [x] Card: Total Cartão de crédito
- [x] Card: Poupança
- [x] Card: Sobreajuste
- [x] Card: Saldo atual (Receitas − Débito − Cartão − Poupança + Ajuste)
- [x] Indicador visual: saldo positivo (verde) / negativo (vermelho)

---

## Iteração 11 — Visão anual ✅

Objetivo: ver todos os meses do ano de uma vez e identificar tendências.

- [x] Listar todos os meses existentes no IndexedDB
- [x] Tabela: mês | Income | Debit | Credit | Saving | Adj. | Balance
- [x] Destacar meses com saldo negativo (vermelho) e positivo (verde)
- [x] Totais anuais no rodapé da tabela
- [x] Navegação rápida: clicar no mês abre aquele mês na aba Expenses
- [x] Seletor de ano (← 2025 →)
- [x] Testes: cálculo dos totais anuais

---

## Iteração 12 — Filtros e busca nas despesas ✅

Objetivo: localizar e analisar despesas rapidamente.

- [x] Busca por nome (filtro de texto em tempo real)
- [x] Filtro por categoria (All / Fixed / Others)
- [x] Filtro por forma de pagamento (All / Debit / Credit)
- [x] Estado de filtro resetado ao mudar de mês (via key={monthKey})
- [x] Form de adição ocultado quando filtros estão ativos

---

## Iteração 13 — Exportação de dados (CSV) ✅

Objetivo: deixar o usuário exportar os dados do mês no mesmo formato que importa.

- [x] Botão "Export" no header
- [x] Gerar CSV no formato compatível com a planilha original
- [x] Download automático via `Blob` + `<a download>`
- [x] Testes: estrutura, valores e round-trip import→export→import

---

## Iteração 14 — PWA e modo offline ✅

Objetivo: app instalável e funcional sem internet.

- [x] Configurar `vite-plugin-pwa` com Workbox (GenerateSW + globPatterns)
- [x] `manifest.json` — nome "Coffer", ícones (192×192, 512×512), tema, `display: standalone`
- [x] Estratégia de cache: `CacheFirst` para assets estáticos
- [x] Registrar service worker no `main.tsx`
- [x] Ícones PWA gerados (pwa-192x192.png, pwa-512x512.png)

---

## Iteração 15 — Internacionalização (i18n)

Objetivo: suporte a English, Português (pt-BR) e Español.

- [ ] Decidir: biblioteca de i18n (ex: `react-i18next`) vs. solução própria leve (dicionários tipados + hook) — projeto deve continuar enxuto
- [ ] Extrair todos os textos da UI para arquivos de tradução (`en`, `pt-BR`, `es`)
- [ ] Idioma padrão detectado do browser (`navigator.language`), fallback `en`
- [ ] Seletor de idioma na página de Settings (Iteração 36)
- [ ] Persistir idioma escolhido via `VaultStore.writeSetting`
- [ ] Formatar moedas e datas conforme locale selecionado (`Intl.NumberFormat`, `Intl.DateTimeFormat`)
- [ ] Testes: renderização correta por locale

---

## Iteração 16 — Qualidade e robustez (pós-revisão) ✅

Objetivo: fechar gaps de UX e erros silenciosos encontrados na revisão.

- [x] `ErrorBoundary` global — captura erros React, mostra tela de recuperação
- [x] Toast system — feedback visual ao salvar/editar (sucesso e erro)
- [x] Feedback de erro no export (CSV vazio ou falha de leitura)
- [x] Erros de save inline no MonthSummary informados ao usuário via toast
- [x] Erros de save no ImportScreen informados ao usuário
- [x] Validação de input numérico (rejeitar NaN silenciosamente, reverter campo)
- [x] USD na visão anual (coluna Balance USD aparece quando há dados)

---

## Iteração 17 — Backup completo criptografado ✅

Objetivo: exportar e importar todos os meses de uma vez, em arquivo pequeno e seguro.

**Formato `.coffer`:**
- Estrutura interna: `{ version: 1, months: Record<string, MonthData> }`
- Pipeline de export: JSON → `CompressionStream('gzip')` (nativo, sem deps) → `encrypt()` com chave da sessão
- Pipeline de import: `decrypt()` → `DecompressionStream('gzip')` → JSON.parse → restaurar cada mês via `writeMonth()`
- O arquivo resultante é ilegível sem a senha mestra — a chave de sessão em memória é usada diretamente
- Nenhum dado sensível viaja pela rede

**Tarefas:**
- [x] `lib/backup.ts` — `exportBackup(db, key): Promise<Blob>` e `importBackup(file, db, key): Promise<number>` (retorna quantidade de meses restaurados)
- [x] Botão "Backup" no header → download do `.coffer`
- [x] Botão "Restore" no header → upload de `.coffer`, confirmar sobrescrita, restaurar
- [x] Feedback: toast com "X months restored" ou erro descritivo
- [x] Testes: round-trip export → import restaura todos os meses intactos
- [x] Testes: arquivo corrompido ou senha errada retorna erro descritivo sem crashar
- [x] Fix: salt embutido no arquivo para restore cross-browser

---

## Iteração 18 — Navegação contextual (UX) ✅

Objetivo: o `MonthNavigator` aparece onde faz sentido; a aba Annual tem sua própria navegação de ano.

**Problema atual:** o seletor de mês fica visível em todas as abas, incluindo Annual — onde é irrelevante e confuso.

**Solução proposta:**
- Ocultar o `MonthNavigator` quando a aba ativa for `annual`
- O seletor de ano (← 2025 →) já existe dentro do `AnnualView` — deixar ele ser o único controle de navegação nessa aba
- Na aba `annual`, o clique em uma linha já navega para o mês — manter esse comportamento e garantir que ao clicar ele troca para a aba `expenses`

**Tarefas:**
- [x] Condicionar renderização do `MonthNavigator` a `tab !== 'annual'`
- [x] Ao clicar num mês no `AnnualView` (`onSelect`): chamar `goTo(key)` + `setTab('expenses')`
- [x] Garantir que o `AnnualView` receba `onSelect` corretamente do `App.tsx`
- [x] Testes: verificar que `onSelect` chama `goTo` com a chave correta

---

## Iteração 19 — Filtros e ordenação nas tabelas ✅

Objetivo: navegação e análise mais rápida nos dados de despesas e receitas.

- [x] Ordenação por coluna em `ExpenseList` (clique no header: Nome, Débito, Cartão, Total) — toggle asc/desc
- [x] Ordenação por coluna em `IncomeList` (Nome, Valor)
- [x] Ordenação por coluna no `AnnualView` (Mês, Income, Debit, Credit, Saving, Balance) — padrão: mês asc
- [x] Indicador visual de coluna ativa e direção (↑↓ no header)
- [x] Estado de ordenação resetado ao trocar de mês (assim como filtros já funcionam via `key={monthKey}`)
- [x] Testes: `ExpenseList` com ordenação por nome asc/desc e por valor desc

---

## Iteração 20 — Gráficos (SVG puro) ✅

Objetivo: visualização rápida dos gastos sem dependência externa.

- [x] Componente `PieChart.tsx` — pizza com proporção Fixo vs Outros e Débito vs Crédito; SVG com `viewBox`, `<path>` por fatia via arco trigonométrico
- [x] Componente `BarChart.tsx` — barras de saldo mensal dos últimos 12 meses; SVG responsivo
- [x] Integrar `PieChart` na aba Summary do mês
- [x] Integrar `BarChart` na aba Annual (acima ou abaixo da tabela)
- [x] Tooltip simples ao hover (SVG `<title>` nativo — zero JS extra)
- [x] Sem dados → estado vazio com mensagem, sem SVG quebrado

---

## Iteração 21 — Orçamento mensal com alerta ✅

Objetivo: o usuário define um teto e o app avisa quando ultrapassar.

- [x] Campo "Budget" por mês no `MonthSummary` (salvo no `MonthData`)
- [x] Badge no header quando total gasto > budget (vermelho, valor do excesso)
- [x] Barra de progresso de gasto vs budget no Summary
- [x] Budget `0` = sem limite definido (comportamento padrão, sem alerta)
- [x] Testes: cálculo correto de excesso; ausência de alerta quando budget = 0

---

## Iteração 22 — Painel de gastos fixos / assinaturas ✅

Objetivo: visibilidade do custo comprometido mensal.

- [x] Nova aba ou seção "Fixed" listando todas as despesas com `fixa: true` do mês atual
- [x] Total comprometido: soma de débito + cartão de todas as fixas
- [x] Comparativo: % do total de receitas comprometido em fixas
- [x] Sem dados → mensagem de estado vazio

---

## Iteração 23 — Tendência de saldo no AnnualView ✅

Objetivo: contexto histórico imediato ao olhar o ano.

- [x] Para cada mês, buscar saldo do mesmo mês do ano anterior
- [x] Coluna "vs ano ant." com ↑ (verde) / ↓ (vermelho) e delta absoluto
- [x] Ocultar coluna se não houver dados do ano anterior

---

## Iteração 24 — Entrada rápida pelo header ✅

Objetivo: registrar uma despesa em 3 toques no celular sem abrir a lista.

- [x] Botão "+" flutuante ou no header → abre modal compacto (nome, valor, débito/cartão)
- [x] Salva no mês corrente e fecha — sem navegação
- [x] Feedback toast de confirmação
- [x] Testes: submit salva no mês corrente; cancelar não altera dados

---

## Iteração 25 — Sync de gastos fixos ✅

Objetivo: permitir trazer gastos marcados como Repeat para um mês que já existe, sem sobrescrever dados.

**Problema:** a clonagem automática só ocorre ao criar um mês novo. Se o mês já existe (o usuário já o visitou), marcar Repeat num mês anterior não tem efeito retroativo.

**Solução — merge, não sobrescrita:**
- Botão discreto "↻ Sync fixed" na aba Expenses
- Ao clicar: lê os gastos com `fixed: true` do mês anterior
- Adiciona **apenas os que ainda não existem** no mês atual (comparação por nome + categoria)
- Não altera nem remove nenhum gasto já presente

**Tarefas:**
- [x] Função `syncFixed(prev: MonthData, current: MonthData): Expense[]` — retorna lista dos gastos a adicionar
- [x] Botão "↻ Sync" na aba Expenses (visível sempre, desabilitado se não houver mês anterior)
- [x] Feedback: toast com "N expense(s) added" ou "Already up to date"
- [x] Testes: sync adiciona apenas os ausentes; não duplica os já existentes

---

## Iteração 26 — Parcelas no crédito ✅

Objetivo: registrar compras parceladas no cartão de crédito de forma simples e sem travar valores.

**Modelo de dados:**
- Novo campo opcional `installments?: number` em `Expense` — parcelas restantes incluindo o mês atual
- `undefined` ou ausente = pagamento único (comportamento atual, sem quebra de compatibilidade)
- O campo `credit` existente armazena o valor daquela parcela específica (editável inline como hoje)

**Input ao adicionar:**
- Quando `credit > 0`: campo opcional "Total ÷ N parcelas"
- Usuário informa total + quantidade → app calcula e preenche `credit = total / N` (arredondado)
- O total é apenas auxiliar de cálculo; não é persistido

**Comportamento de clonagem:**
- `installments > 1` → clona com `installments - 1`
- `installments === 1` → não clona (última parcela)
- `installments` undefined → comportamento atual (clona se `fixed: true`)

**Display:**
- Badge `(Nx)` ao lado do nome na linha — some quando `N = 1`
- Valor da parcela editável inline como qualquer outro gasto

**Tarefas:**
- [x] Atualizar tipo `Expense` e `expenseSchema` com `installments?: number`
- [x] Atualizar lógica de clonagem em `cloneFixed()` para decrementar `installments`
- [x] Formulário de adição: campo "Total" + "Parcelas" quando crédito > 0; calcular e preencher `credit`
- [x] Badge `(Nx)` na linha da despesa
- [x] Testes: clonagem decrementa corretamente; última parcela não clona; valor editável

---

## Iteração 27 — Tech debt: destravar produção ✅

Objetivo: `npm run build` e `npm run lint` voltarem a passar. Hoje só `dev` funciona; deploy e CI estão quebrados.

**Tarefas:**
- [x] `src/lib/schemas.ts` — migrar `err.errors` → `err.issues` (Zod v4) e tipar o map
- [x] `src/lib/backup.ts:29` — resolver incompatibilidade de `Uint8Array<ArrayBufferLike>` com `BufferSource` (cast ou `new Uint8Array(bytes)` de cópia)
- [x] `src/lib/parseCSV.ts:111` — incluir `budget: 0` no retorno de `Omit<MonthData, 'key'>`
- [x] `src/hooks/useYearSummary.ts` — tirar `setState` de dentro do effect body (mover para dentro do `.then`/`.catch`)
- [x] `src/components/Toast.tsx` — mover `useToast` hook para um arquivo separado (react-refresh exige só componentes no arquivo)
- [x] `src/components/PieChart.tsx` — eliminar reassign de `cursor` após render (react-hooks/immutability) via `reduce`
- [x] `src/lib/syncFixed.ts` — eliminar o `_` não-usado (desestruturar sem atribuir id)
- [x] `src/hooks/useCurrentMonth.test.ts` — remover import `MonthData` não usado
- [x] Garantir que `npm run build` e `npm run lint` passem limpos

---

## Iteração 28 — Segurança de sessão e onboarding ✅

Objetivo: fechar brechas óbvias de segurança num cofre que roda no browser.

**Problema:** hoje, se o usuário abrir o Coffer e deixar a aba aberta, a chave derivada fica em memória indefinidamente. Alguém com acesso físico à máquina vê tudo. Além disso, o setup não avisa que a senha não tem recovery.

**Tarefas:**
- [x] Auto-lock por inatividade — timeout configurável (default 15 min). Monitorar atividade (mousemove, keydown, visibilitychange); depois do timeout, chamar `logout()` e voltar para LoginScreen
- [x] Campo nas settings para o usuário ajustar o timeout (5/15/30/60 min ou "never")
- [x] Lock automático quando a aba perde foco por mais do que o timeout (não imediatamente, ou atrapalha copiar/colar)
- [x] Aviso explícito no SetupScreen: "Se você esquecer esta senha, todos os seus dados ficarão inacessíveis — não há como recuperar. Anote em local seguro."
- [x] Checkbox "Eu entendo que não há recuperação de senha" obrigatório antes de criar o cofre
- [x] Testes: inatividade dispara logout; checkbox bloqueia submit

---

## Iteração 29 — Receita recorrente ✅

Objetivo: parar de redigitar salário todo mês. Hoje só despesa com `fixed: true` clona; renda não.

**Tarefas:**
- [x] Campo `recurring?: boolean` em `Income` e `incomeSchema`
- [x] Ao navegar para mês novo em `useCurrentMonth.goForward`, clonar também incomes `recurring: true` (como já faz com fixed expenses)
- [x] Checkbox "Repeat" na linha de Income (mesmo padrão visual de Expense)
- [x] Testes: clonagem inclui apenas recorrentes; não duplica em mês já existente

---

## Iteração 30 — README e docs de open source ✅

Objetivo: deixar o projeto apresentável para contribuidores e usuários. Hoje o README tem 20 linhas.

**Tarefas:**
- [x] Reescrever `README.md` com: descrição curta, **badges** (licença, build), lista de features, seção "Why Coffer?" (motivação), stack, instruções de instalação/dev, privacy/security model, roadmap, link para CONTRIBUTING
- [ ] Criar `docs/screenshots/` com prints do Setup, Expenses, Summary, Annual, QuickAdd, Backup — referenciar no README
- [ ] (Opcional) Gravar gif demo curto (~15s) do fluxo principal: setup → adicionar despesa → ver summary → backup
- [x] Criar `CONTRIBUTING.md`: como rodar, como abrir issue, como abrir PR, estilo de commit (Conventional Commits), estilo de código (eslint/prettier), como rodar testes
- [x] Criar `LICENSE` (MIT sugerido — simples, permissivo)
- [x] Criar `CODE_OF_CONDUCT.md` (Contributor Covenant boilerplate)
- [x] `.github/ISSUE_TEMPLATE/` com bug report e feature request
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] `.github/workflows/ci.yml` — GitHub Actions rodando lint + test + build em cada PR

---

## Iteração 31 — Recorrência intuitiva (remover "Repeat" quebrado) ✅

Objetivo: o "Repeat" atual não repete — copia escondido ao navegar, morre após um mês
(syncFixed zera o flag) e se comporta diferente entre despesa e receita. Princípio: **antes
não ter do que ter quebrado**. Remover tudo e substituir por uma ação explícita (modal
"Copiar do mês anterior").

**Parte 1 — Remoção do mecanismo quebrado ✅**
- [x] Deletar `lib/syncFixed.ts` + `syncFixed.test.ts`
- [x] Remover campo `fixed` do `Expense` (schema, tipos, forms, parseCSV) — `category` continua o agrupamento
- [x] Remover campo `recurring` do `Income`
- [x] Remover checkbox "Repeat" da despesa e da receita
- [x] Remover botão "↻ Sync fixed"
- [x] `useCurrentMonth.goForward` volta a ser navegação pura (sem leitura/escrita escondida)
- [x] Cortar a aba/painel "Fixed" (5 abas → 4)
- [x] Suíte verde (typecheck + lint + 197 testes)

**Parte 2 — Modal "Copiar do mês anterior" (Opção B) ✅**
- [x] `CopyFromPreviousModal`: lista receitas + despesas do mês anterior com checkboxes
- [x] Dedupe automático (item já presente no mês aparece desmarcado/cinza "already here")
- [x] Parcelas: ao copiar item com `installments > 1`, decrementa; `installments === 1` não é oferecido
- [x] Botão "Copy from previous month" na aba Expenses; lista remonta após copiar
- [x] Testes do fluxo (seleção, dedupe, decremento de parcela, empty state)

---

## Iteração 32 — UI/UX overhaul: "vault ledger" + sidebar ✅

Objetivo: a app era pouco intuitiva. Redesign com identidade própria (cofre/livro-razão):
sidebar-espinha, acento latão sobre tinta fria, serif no wordmark, números mono tabulares,
affordance de edição inline. Mockup aprovado. Implementação incremental (shell → tela a tela).

**P2.1 — Shell + tokens ✅**
- [x] Tokens de tema no `@theme` (ink/panel/line/fg/dim/faint/brass/pos/neg + font serif)
- [x] `Icons.tsx` (line icons inline, sem dependência)
- [x] `App.tsx`: header+tabs → sidebar (marca, nav Ledger, nav Data, selo "Encrypted · Local", Settings/Lock)
- [x] Topbar: month nav (serif + chevrons latão) + budget + Add (latão)
- [x] `MonthNavigator` reestilizado; responsivo (sidebar vira barra horizontal no mobile)

**P2.2 — Tela Expenses (ledger) ✅**
- [x] Migrar `ExpenseList` para tokens; grupos Fixed/Others com label latão
- [x] Affordance de edição inline (sublinhado tracejado no hover) + dica "Tap … Enter saves"
- [x] Cabeçalhos uppercase; números mono tabulares; totais mono; botão Copy em ghost

**P2.3 — Income + Summary ✅**
- [x] `IncomeList` para tokens
- [x] `MonthSummary`: cards com hairline latão + número mono, Balance semântico +/−, budget bar latão/neg
- [x] `PieChart` recolorido on-brand (latão/steel/sage/clay) + textos em tokens

**P2.4 — Annual + modais ✅**
- [x] `AnnualView` para tokens (+ tabular-nums na tabela)
- [x] `QuickAddModal`, `SettingsModal`, `CopyFromPreviousModal`, `ImportScreen` para tokens (botões primários em latão)

**P2.5 — Tema claro + toggle ✅**
- [x] Valores light nos tokens (media query + `[data-theme]` nas duas direções)
- [x] Telas de auth (Setup/Login) migradas para tokens (indigo→latão, warning→neg)
- [x] Toggle sol/lua na sidebar, persistido em localStorage; aplicado antes do 1º paint no `main.tsx`

---

## Iteração 33 — Fechamento de mês ✅

Objetivo: o saldo de um mês passa para o seguinte de forma automática e auditável —
sem digitar "Saldo atual" à mão. Hoje todos os dados são BRL; escopo inicial = saldo BRL
(a Iteração 34 torna isso "saldo do ambiente de moeda ativo").

Decisões tomadas:
- Mês fechado fica **somente leitura** até "Reabrir"
- Saldo negativo passa como entrada **negativa** (permitido só na entrada de carry-over)
- Ao fechar outubro/2026, a entrada manual "Saldo atual" de novembro é substituída pela automática

**Tarefas:**
- [x] `MonthData`: `closing?: { balance: number; closedAt: string }` + schema
- [x] `Income`: `carryFrom?: string` (YYYY-MM de origem) + schema — `amount` pode ser negativo só quando `carryFrom` presente
- [x] Lógica pura `closeMonth` / `reopenMonth` (`lib/closing.ts`): calcula saldo, grava `closing`, cria **ou atualiza** (nunca duplica) a entrada `carryFrom` no mês seguinte; bloqueia se o mês seguinte estiver fechado
- [x] `writeMonths` grava os dois meses numa única transação IndexedDB (tudo ou nada)
- [x] Painel "Month closing" no Summary: "Close month" com confirmação mostrando o saldo e o mês destino; "Closed on DD/MM/AAAA · R$ X carried to …" + "Reopen"
- [x] Selo "Closed" no topo; Add rápido desabilitado; Expenses/Income/Summary somente leitura (UI + guarda nos hooks)
- [x] Entrada de carry-over em Income: não editável/removível, marcada "↳ Closing of Oct 2026"
- [x] Aviso no mês seguinte se o mês de origem foi reaberto
- [x] "Copy from previous month" nunca copia saldo carregado
- [x] Hooks se atualizam quando o mês é gravado em outro lugar (`monthEvents` + `useMonthRevision`)
- [x] Testes: fechar, refechar (atualiza sem duplicar), reabrir, saldo negativo/zero, bloqueio de edição, UI

---

## Iteração 34 — Ambientes por moeda

Objetivo: não misturar moedas. Configuração global escolhe a moeda ativa; cada moeda é um
ambiente independente (receitas, despesas, poupança, reajuste, orçamento, fechamento próprios).

⚠️ Altera decisão arquitetural do CLAUDE.md ("Every Expense and Income has a `currency` field")
— discutir modelo antes de implementar:
- [ ] Definir armazenamento (ex.: chave `BRL:2026-11` no store `months` vs store por moeda)
- [ ] Migração dos dados existentes (meses com itens em moedas misturadas)
- [ ] Seletor de moeda ativa (Settings ou sidebar) — persistido
- [ ] Remover coluna/seletor de moeda das linhas de despesa e receita
- [ ] Annual, Export, Backup e Fechamento passam a operar por ambiente
- [ ] Resolve a decisão pendente "Saving/adjustment currency"

---

## Iteração 36 — Página de Settings

Objetivo: um lugar único e claro para as configurações globais, no lugar do `SettingsModal`.
Base para a moeda ativa (Iteração 34) e o idioma (Iteração 15) — fazer antes delas.

- [ ] Item "Settings" na sidebar abre uma página (não modal), seguindo o design "vault ledger"
- [ ] Mover o timeout de auto-lock do `SettingsModal` para a página e remover o modal
- [ ] Seções preparadas para: Moeda (Iteração 34), Idioma (Iteração 15), Segurança (auto-lock)
- [ ] Settings persistidas via `VaultStore.writeSetting` (seguir o padrão atual do timeout)
- [ ] Testes: navegação até a página, alterar e persistir cada configuração

---

## Iteração 37 — Camada de armazenamento + cofre em arquivo ✅

Objetivo: os dados deixam de depender do navegador. O cofre passa a ser um arquivo
`.coffer` do usuário (ex.: `Documentos\Coffer\meu-cofre.coffer`); limpar/resetar/desinstalar
o navegador não apaga nada, e copiar o arquivo leva tudo para outra máquina.

Altera a decisão arquitetural de persistência só em IndexedDB — CLAUDE.md atualizado.
A store em arquivo ainda não é usada pela UI: ela é ligada ao filesystem real na Iteração 38.

Decisões tomadas:
- Arquivo único criptografado (formato `.coffer` existente), **não SQLite** — volume é de poucos KB
  por mês, e SQLite exigiria SQLCipher (quebra a regra "só Web Crypto")
- O Coffer passa a ser só desktop: o IndexedDB fica apenas até a Iteração 38 ligar o cofre em arquivo, e então é removido

**Tarefas:**
- [x] Extrair interface de armazenamento `VaultStore` (`lib/vaultStore.ts`) a partir do `lib/db.ts` — hooks e UI passam a depender só da interface
- [x] Implementação IndexedDB (`lib/idbStore.ts` — comportamento atual, sem mudança)
- [x] Implementação em arquivo (`lib/fileStore.ts`): carrega o `.coffer` na abertura, regrava a cada alteração; primitivas de filesystem injetadas (`VaultFileIO`)
- [x] Escrita atômica (grava temporário → renomeia) para não corromper em queda de energia
- [x] Cópias antigas automáticas: uma por sessão de uso, mantendo as 3 últimas (`.bak1`…`.bak3`)
- [x] Salt e verificationToken dentro do arquivo (o cofre é self-contained)
- [x] Testes: a mesma suíte de contrato roda contra as duas implementações; escrita interrompida não corrompe o cofre

---

## Iteração 38 — App desktop (Tauri)

Objetivo: "baixar e usar" — um instalador para Windows, sem depender de navegador.
Depende da Iteração 37. O Coffer deixa de ter versão web/PWA (sem celular).

Pré-requisito na máquina de desenvolvimento: Rust (rustup) + Microsoft C++ Build Tools.

- [ ] `tauri init` sobre o build Vite — ícone, nome, janela
- [ ] Tela inicial: "Criar cofre" (escolher onde salvar) / "Abrir cofre existente"; lembrar o último cofre aberto
- [ ] Ligar a implementação em arquivo (Iteração 37) ao filesystem do Tauri, com permissão restrita ao arquivo escolhido
- [ ] Migração dos dados atuais: Backup na versão web (IndexedDB) → Restore do `.coffer` no app desktop; validar com os dados reais antes de remover o IndexedDB
- [ ] Instalador Windows (.msi/.exe) publicado no GitHub Releases via CI
- [ ] Documentar no README o aviso do SmartScreen (sem certificado de assinatura) e como instalar
- [ ] Remover `lib/idbStore.ts` e a dependência `fake-indexeddb` (testes passam a usar a store em arquivo com IO em memória)
- [ ] Remover o PWA: `vite-plugin-pwa`, service worker, manifest e ícones PWA (e a regra `--legacy-peer-deps`)
- [ ] Atualizar CLAUDE.md e README: stack, modelo de segurança e instruções de instalação
- [ ] Avaliar depois: certificado de assinatura, auto-updater, builds macOS/Linux

---

## Simplificação para o usuário comum — ordem sugerida

1. Iteração 37 (cofre em arquivo) → 38 (app desktop)
2. Iteração 36 (Settings — tirar Import/Export/Backup/fechamento da tela principal)
3. Iteração 34 (moeda única por ambiente)

Ideias ainda sem iteração:
- [ ] Primeiro uso guiado: mês vazio mostra "Adicione sua primeira receita" em vez de tabela vazia
- [ ] Chave de recuperação imprimível no setup (mexe na decisão de autenticação — discutir antes)

---

## Bugs conhecidos

- [x] Selo "over budget" do topo não atualiza ao editar despesas/orçamento — corrigido na Iteração 33 (hooks relêem o mês via `useMonthRevision`)

---

## Fase 2 — Depois que a Fase 1 estiver estável

Objetivo: ampliar o alcance da aplicação sem perder o local-first.

Sync entre máquinas: basta guardar o arquivo do cofre numa pasta sincronizada (OneDrive, Google Drive,
Dropbox) — não há integração de cloud própria.

### 2.1 — Executável desktop

Antecipado para a Iteração 38 (Tauri, Windows primeiro). Restante para depois:

- [ ] Builds assinados para macOS (.dmg) e Linux (.AppImage)
- [ ] CI cross-platform para gerar releases automaticamente
- [ ] Auto-updater (Tauri tem embutido)

### 2.2 — Nice-to-haves

- [ ] Deletar mês (com confirmação forte, ex: digitar o `YYYY-MM`)
- [ ] Import OFX/QIF (formatos de extrato bancário)
- [ ] Export para PDF do resumo mensal

---

## Transversal (aplicar ao longo de todas as iterações)

- [x] Layout responsivo mobile-first em todos os componentes
- [x] Feedback visual ao salvar/editar (toast system)
- [x] Estados de carregamento em operações assíncronas
- [x] Mensagens de erro amigáveis (sem stack trace exposto ao usuário)
- [x] `ErrorBoundary` global para capturar erros inesperados
- [x] Contagem de itens por mês visível no AnnualView (coluna "Items" + total anual)
