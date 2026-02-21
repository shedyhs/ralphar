# Ralph Subagents Pipeline Design

## Problema

O `ralph.sh` atual usa um único agente sequencial que faz tudo: planeja, implementa, testa e commita. Isso resulta em baixa qualidade porque não há validação cruzada — o mesmo agente que escreve o código é o que julga se está bom.

## Solução

Pipeline de 8 papéis com dois loops de qualidade:
- **Loop de planejamento**: 3 validadores devem aprovar o plano unanimemente
- **Loop de implementação**: revisor deve aprovar o código

## Arquitetura

```
for iteração em 1..N:
    limpa .ralph/

    ┌─ PLANEJAMENTO ──────────────────────────────────┐
    │                                                   │
    │  PLANEJADOR (com buscadores paralelos internos)   │
    │  → .ralph/context.md + .ralph/plan.md             │
    │                                                   │
    │  Loop até consenso unânime:                       │
    │      VALIDADOR A ─┐                               │
    │      VALIDADOR B ─┤ paralelo → validation-{a,b,c}.md
    │      VALIDADOR C ─┘                               │
    │      Se os 3 aprovaram → segue                    │
    │      Se qualquer rejeitou → PLANEJADOR reescreve  │
    │                                                   │
    └───────────────────────────────────────────────────┘

    ┌─ IMPLEMENTAÇÃO + QUALIDADE ─────────────────────┐
    │                                                   │
    │  Loop até aprovação:                              │
    │      IMPLEMENTADOR → código + implementation.md   │
    │      TESTADOR → typecheck/tests/lint → test-report.md
    │      REVISOR → review.md (APPROVED ou CHANGES_REQUESTED)
    │      Se APPROVED → segue                          │
    │      Se CHANGES_REQUESTED → volta pro IMPLEMENTADOR
    │                                                   │
    └───────────────────────────────────────────────────┘

    COMMITTER → atualiza PRD.md + features.json + git commit

    Se PRD completo → exit
```

## Papéis

### 1. Planejador

- **Input**: PRD.md, features.json, .ralph/validation-{a,b,c}.md (se retry)
- **Output**: .ralph/context.md, .ralph/plan.md
- **Comportamento**:
  1. Lê PRD.md e identifica a tarefa de maior prioridade
  2. Dispara múltiplos buscadores paralelos via Task tool (subagent_type=Explore) para entender o codebase
  3. Consolida o contexto em .ralph/context.md
  4. Escreve o plano em .ralph/plan.md
  5. Em retries, lê o feedback dos 3 validadores e ajusta o plano

### 2. Validador A — Coerência

- **Input**: .ralph/plan.md, .ralph/context.md, PRD.md
- **Output**: .ralph/validation-a.md
- **Avalia**: O plano é coerente? As decisões fazem sentido dado o contexto? Há contradições?

### 3. Validador B — Completude

- **Input**: .ralph/plan.md, .ralph/context.md, PRD.md
- **Output**: .ralph/validation-b.md
- **Avalia**: O plano cobre tudo que a tarefa pede? Falta algum caso? Falta tratamento de erro?

### 4. Validador C — Simplicidade

- **Input**: .ralph/plan.md, .ralph/context.md, PRD.md
- **Output**: .ralph/validation-c.md
- **Avalia**: O plano é desnecessariamente complexo? Tem over-engineering? Pode ser mais simples?

### 5. Implementador

- **Input**: .ralph/plan.md, .ralph/review.md (se retry)
- **Output**: código implementado, .ralph/implementation.md
- **Comportamento**: Segue o plano aprovado. Em retries, corrige os issues do review.

### 6. Testador

- **Input**: .ralph/implementation.md
- **Output**: .ralph/test-report.md
- **Comportamento**: Roda os 3 feedback loops:
  1. `npm run typecheck` — deve passar sem erros
  2. `npm run test` — deve passar
  3. `npm run lint` — deve passar
- Reporta PASS/FAIL com detalhes de cada um.

### 7. Revisor

- **Input**: .ralph/plan.md, .ralph/implementation.md, .ralph/test-report.md, git diff
- **Output**: .ralph/review.md
- **Avalia**:
  - Código segue o plano aprovado?
  - Testes passaram?
  - Qualidade do código (legibilidade, segurança, boas práticas)
  - Veredicto: `APPROVED` ou `CHANGES_REQUESTED` com lista de issues

### 8. Committer

- **Input**: .ralph/plan.md, .ralph/implementation.md
- **Output**: PRD.md atualizado, features.json atualizado, git commit
- **Comportamento**: Atualiza PRD marcando tarefa como concluída, appenda progresso em features.json, faz commit.

## Comunicação entre Estágios

Toda comunicação via arquivos em `.ralph/`:

```
.ralph/
├── context.md          # Contexto do codebase (escrito pelo planejador)
├── plan.md             # Plano da tarefa (escrito pelo planejador)
├── validation-a.md     # Feedback do validador A
├── validation-b.md     # Feedback do validador B
├── validation-c.md     # Feedback do validador C
├── implementation.md   # O que foi implementado (escrito pelo implementador)
├── test-report.md      # Resultado dos testes (escrito pelo testador)
└── review.md           # Code review (escrito pelo revisor)
```

Os arquivos são limpos no início de cada iteração.

## Execução

Cada papel é uma chamada separada `claude -p` com:
- `--permission-mode acceptEdits` para permitir edições
- Prompt específico para o papel
- Referência aos arquivos `.ralph/` relevantes via `@`

Os validadores A, B e C rodam em **paralelo** (3 processos bash simultâneos com `&` e `wait`).

Todos os outros estágios rodam **sequencialmente**.

## Formato dos Arquivos de Validação/Review

Cada arquivo de validação e review deve começar com uma linha de veredicto:

```
VERDICT: APPROVED
```

ou

```
VERDICT: CHANGES_REQUESTED

## Issues

1. [descrição do problema]
2. [descrição do problema]
```

O script bash faz grep por `VERDICT: APPROVED` para decidir o fluxo.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Loop infinito no planejamento (validadores nunca concordam) | Usuário pode Ctrl+C. Log mostra número da tentativa |
| Loop infinito na implementação (revisor nunca aprova) | Usuário pode Ctrl+C. Log mostra número da tentativa |
| Custo de tokens alto (muitas chamadas) | Cada estágio recebe apenas arquivos relevantes, não todo o contexto |
| Arquivos .ralph stale | Limpos no início de cada iteração |
| Buscadores paralelos do planejador retornam info irrelevante | Planejador filtra e consolida no context.md |
