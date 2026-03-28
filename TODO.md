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

## Iteração 11 — Internacionalização (i18n)

Objetivo: suporte a 3 idiomas — English, Português (BR) e Español.

- [ ] Escolher e instalar biblioteca de i18n (ex: `react-i18next`)
- [ ] Extrair todos os textos da UI para arquivos de tradução (`en`, `pt-BR`, `es`)
- [ ] Seletor de idioma nas configurações do app
- [ ] Persistir idioma escolhido no IndexedDB (settings store)
- [ ] Formatar moedas e datas conforme locale selecionado (`Intl.NumberFormat`, `Intl.DateTimeFormat`)
- [ ] Testes: renderização correta por locale

---

## Transversal (aplicar ao longo de todas as iterações)

- [ ] Layout responsivo mobile-first em todos os componentes (base → `sm:` → `md:`)
- [ ] Feedback visual ao salvar/editar (ex.: flash de confirmação inline)
- [ ] Estados de carregamento em operações assíncronas (leitura/escrita no IndexedDB)
- [ ] Mensagens de erro amigáveis (sem stack trace exposto ao usuário)
- [ ] `ErrorBoundary` global para capturar erros inesperados
