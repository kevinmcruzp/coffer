# TODO — Coffer

## 1. PWA + Offline
- [ ] Configurar `next-pwa` com service worker
- [ ] Manifest (`manifest.json`) — nome, ícone, tema
- [ ] Cache offline do app shell (páginas e assets estáticos)
- [ ] Testar instalação no browser (desktop e mobile)

## 2. Segurança — Criptografia local
- [ ] Tela de setup — definir senha mestra no primeiro acesso
- [ ] Tela de login — senha mestra para abrir o app
- [ ] Derivar chave via **PBKDF2** (200k iterações, salt aleatório)
- [ ] Criptografar/descriptografar dados com **AES-256-GCM** (IV aleatório por escrita)
- [ ] Nunca persistir a chave — apenas em memória durante a sessão
- [ ] Nunca salvar texto plano no IndexedDB

## 3. Estrutura de dados
- [ ] Definir schema de tipos TypeScript — meses, receitas, despesas, formas de pagamento
- [ ] Setup IndexedDB com helper de leitura/escrita criptografada
- [ ] Lógica de clonar despesas fixas de um mês para o próximo automaticamente

## 4. Dashboard (página principal)
- [ ] Cards de resumo: Receitas, Despesas, Cartão, Poupança, Saldo atual, Total gasto
- [ ] Navegação por mês (← Janeiro 2025 →)
- [ ] Indicador visual de saldo positivo/negativo

## 5. Despesas
- [ ] Listagem por categoria (Fixo / Outros) com separação visual
- [ ] Coluna Débito e Coluna Cartão de crédito por item
- [ ] Adicionar despesa (nome, categoria, valor débito, valor cartão)
- [ ] Editar despesa inline
- [ ] Excluir despesa
- [ ] Marcar despesa como fixa (replica nos próximos meses)

## 6. Receitas
- [ ] Adicionar/editar receitas do mês
- [ ] Suporte a múltiplas fontes de receita

## 7. Poupança
- [ ] Campo de poupança mensal
- [ ] Histórico de poupança acumulada

## 8. Ajustes
- [ ] Campo "Sobreajuste" (correção manual de saldo)

## 9. Importação
- [ ] Importar CSV no formato da planilha existente (migração dos dados históricos)

## 10. UI/UX
- [ ] Layout responsivo (mobile-first)
- [ ] Feedback visual ao salvar/editar
- [ ] Totais calculados em tempo real
