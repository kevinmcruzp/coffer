# TODO — Coffer

Metodologia: ciclo XP — cada iteração entrega software funcionando e testado.
Fluxo por tarefa: escrever teste → implementar → refatorar → commit.

---

## Iteração 0 — Infraestrutura de testes e tipos base

Objetivo: base técnica sólida antes de qualquer feature.

- [ ] Instalar e configurar Vitest + jsdom + React Testing Library
- [ ] Configurar script `test` e `test:watch` no `package.json`
- [ ] Instalar Zod para validação de input
- [ ] Definir tipos TypeScript base: `Category`, `PaymentMethod`, `Expense`, `Income`, `Saving`, `MonthData`
- [ ] Definir schemas Zod para cada tipo (validação de input do usuário)
- [ ] Testes: schemas Zod com casos válidos e inválidos (boundary values)

---

## Iteração 1 — Camada de criptografia

Objetivo: funções de crypto isoladas, sem UI, 100% testadas.

- [ ] Implementar `deriveKey(password, salt)` via PBKDF2 (200k iterações, SHA-256)
- [ ] Implementar `generateSalt()` e `generateIV()` aleatórios
- [ ] Implementar `encrypt(data, key)` via AES-256-GCM (IV embutido no output)
- [ ] Implementar `decrypt(ciphertext, key)` via AES-256-GCM
- [ ] Gerar e armazenar separadamente um `verificationToken` criptografado para validar senha no login
- [ ] Testes: encrypt → decrypt round-trip com mesma chave
- [ ] Testes: decrypt com chave errada lança erro
- [ ] Testes: outputs distintos para mesma entrada (IV aleatório)
- [ ] Testes: `verificationToken` válida senha correta e rejeita incorreta

---

## Iteração 2 — Camada de persistência (IndexedDB)

Objetivo: ler e escrever dados criptografados no IndexedDB.

- [ ] Helper `openDB()` — inicializa IndexedDB com stores: `settings`, `months`
- [ ] Helper `writeSetting(key, value)` — escrita simples (salt e verificationToken em texto plano)
- [ ] Helper `readSetting(key)`
- [ ] Helper `writeMonth(monthKey, data, key)` — serializa, criptografa e salva
- [ ] Helper `readMonth(monthKey, key)` — lê, descriptografa e desserializa
- [ ] Helper `listMonths()` — retorna lista de chaves de meses existentes
- [ ] Testes de integração: write/read round-trip com chave correta
- [ ] Testes: leitura com chave errada lança erro

---

## Iteração 3 — Autenticação (Setup e Login)

Objetivo: primeiro fluxo visível — abrir o app e autenticar.

- [ ] Detectar primeiro acesso (ausência de salt no IndexedDB)
- [ ] Tela de Setup: campo senha + confirmação, validação (mínimo 8 chars, senhas iguais)
- [ ] Ao confirmar setup: gerar salt, derivar chave, gerar verificationToken, salvar salt + token
- [ ] Tela de Login: campo senha, derivar chave, validar via verificationToken
- [ ] Context/hook `useSession` — expõe chave derivada em memória; nunca persistida
- [ ] Botão de logout — limpa chave da memória e volta para login
- [ ] Roteamento mínimo: `/setup`, `/login`, `/app` (protegida)
- [ ] Testes: componente Setup — validações de senha
- [ ] Testes: componente Login — senha correta navega para `/app`, incorreta exibe erro
- [ ] Testes: `useSession` — estado inicial, login, logout

---

## Iteração 4 — Despesas (CRUD)

Objetivo: funcionalidade central — registrar e gerenciar despesas do mês.

- [ ] Hook `useExpenses(monthKey)` — CRUD sobre IndexedDB com chave de sessão
- [ ] Listar despesas agrupadas por categoria: **Fixo** e **Outros**
- [ ] Colunas por item: Nome | Débito | Cartão de crédito
- [ ] Formulário inline: adicionar despesa (nome, categoria, valor débito, valor cartão)
- [ ] Editar despesa inline (clique no campo)
- [ ] Excluir despesa (com diálogo de confirmação)
- [ ] Checkbox "Fixa" por despesa (replica no próximo mês)
- [ ] Totais calculados em tempo real: Total Débito, Total Cartão, Total Geral
- [ ] Validação de input via Zod antes de salvar
- [ ] Testes: `useExpenses` — add, edit, delete, totais
- [ ] Testes: componente de listagem renderiza agrupamentos corretos
- [ ] Testes: validação rejeita valores negativos e strings em campos numéricos

---

## Iteração 5 — Receitas (CRUD)

Objetivo: registrar de onde vem o dinheiro do mês.

- [ ] Hook `useIncomes(monthKey)` — CRUD sobre IndexedDB
- [ ] Formulário: adicionar receita (nome/fonte, valor)
- [ ] Editar receita inline
- [ ] Excluir receita (com confirmação)
- [ ] Suporte a múltiplas fontes no mesmo mês
- [ ] Total de receitas calculado em tempo real
- [ ] Testes: `useIncomes` — add, edit, delete, total

---

## Iteração 6 — Poupança e Sobreajuste

Objetivo: registrar quanto foi guardado e corrigir saldo manualmente.

- [ ] Campo de poupança mensal (valor único por mês)
- [ ] Campo "Sobreajuste" — correção manual de saldo (ex.: estorno, devolução)
- [ ] Hook `useMonthMeta(monthKey)` — lê e salva poupança + ajuste
- [ ] Testes: alteração de poupança e ajuste reflete no MonthData salvo

---

## Iteração 7 — Navegação por mês e clonagem de fixas

Objetivo: navegar entre meses e não redigitar despesas fixas.

- [ ] Componente `MonthNavigator` — exibe "← Mês Ano →" e navega entre meses
- [ ] Ao avançar para mês inexistente: criar novo `MonthData` clonando despesas fixas do anterior
- [ ] Ao voltar: carregar mês existente sem alterações
- [ ] Hook `useCurrentMonth` — controla mês selecionado e dispara carregamento
- [ ] Testes: clonagem copia apenas despesas com `fixa: true`
- [ ] Testes: navegar para mês já existente não duplica dados

---

## Iteração 8 — Importação de dados históricos (CSV)

Objetivo: migrar dados da planilha existente para o Coffer.

- [ ] Definir e documentar o formato CSV esperado (colunas, separador, encoding)
- [ ] Parser `parseCSV(text)` — extrai linhas e mapeia para `MonthData`
- [ ] Tela de importação: upload de arquivo, preview tabular dos dados parseados
- [ ] Confirmação antes de salvar (sobrescreve mês existente?)
- [ ] Salvar dados importados criptografados no IndexedDB
- [ ] Testes: parse de CSV válido gera estrutura correta
- [ ] Testes: CSV com colunas faltando retorna erro descritivo
- [ ] Testes: CSV malformado não salva nada

---

## Iteração 9 — PWA e modo offline

Objetivo: app instalável e funcional sem internet.

- [ ] Configurar `vite-plugin-pwa` com Workbox (GenerateSW)
- [ ] `manifest.json` — nome "Coffer", ícones (192×192, 512×512), tema, `display: standalone`
- [ ] Estratégia de cache: `CacheFirst` para assets, `NetworkFirst` para nada (app é local)
- [ ] Registrar service worker no `main.tsx`
- [ ] Testar instalação no Chrome (desktop) e no Safari/Chrome (mobile)
- [ ] Testar funcionamento completo offline (modo avião)

---

## Iteração 10 — Dashboard

Objetivo: visão consolidada do mês — últimas prioridade, entregue quando o núcleo está sólido.

- [ ] Card: Receitas totais
- [ ] Card: Total Débito
- [ ] Card: Total Cartão de crédito
- [ ] Card: Poupança
- [ ] Card: Sobreajuste
- [ ] Card: Saldo atual (Receitas − Débito − Cartão − Poupança + Ajuste)
- [ ] Indicador visual: saldo positivo (verde) / negativo (vermelho)
- [ ] Testes: cálculo do saldo com todos os cenários (zero, positivo, negativo)

---

## Transversal (aplicar ao longo de todas as iterações)

- [ ] Layout responsivo mobile-first em todos os componentes (base → `sm:` → `md:`)
- [ ] Feedback visual ao salvar/editar (ex.: flash de confirmação inline)
- [ ] Estados de carregamento em operações assíncronas (leitura/escrita no IndexedDB)
- [ ] Mensagens de erro amigáveis (sem stack trace exposto ao usuário)
- [ ] `ErrorBoundary` global para capturar erros inesperados
