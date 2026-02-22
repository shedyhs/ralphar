# Backend Reviewer Skill - Design

## Objetivo

Skill para revisar codigo backend identificando code smells, sugerindo tecnicas de refactoring e recomendando design patterns quando aplicavel. Funciona tanto para PRs/diffs quanto para modulos/arquivos inteiros. Language-agnostic.

## Estrutura

```
backend-reviewer/
├── SKILL.md              (~300 linhas) - Workflow + report template + severidade
└── references/
    ├── code-smells.md    (~200 linhas) - 23 smells com sintomas e tratamentos
    ├── refactoring.md    (~200 linhas) - Tecnicas agrupadas por categoria
    └── design-patterns.md (~150 linhas) - 22 patterns com sinais de uso
```

### SKILL.md

Contem:
1. Frontmatter (name, description com triggers pushy)
2. Workflow de review (como conduzir, o que olhar primeiro)
3. Template do report estruturado
4. Criterios de severidade (Critical, Warning, Info)
5. Ponteiros para references (quando consultar cada arquivo)

### References

Versoes condensadas da documentacao do refactoring.guru, otimizadas para consulta rapida durante review. Nao copias integrais.

## Workflow do Review

```
1. IDENTIFICAR CONTEXTO
   ├── PR/diff? → Focar nas linhas alteradas + contexto ao redor
   └── Modulo/arquivo? → Analisar estrutura geral

2. SCAN POR CODE SMELLS
   ├── Ler o codigo
   ├── Consultar references/code-smells.md para smells detectados
   └── Classificar severidade de cada finding

3. AVALIAR DESIGN
   ├── Verificar se algum design pattern resolveria problemas encontrados
   ├── Consultar references/design-patterns.md se relevante
   └── Avaliar acoplamento, coesao, principios SOLID

4. SUGERIR REFACTORINGS
   ├── Para cada smell, indicar tecnica de refactoring especifica
   ├── Consultar references/refactoring.md para detalhes
   └── Priorizar sugestoes por impacto

5. GERAR REPORT
   └── Preencher template com findings, severidade e sugestoes
```

### Regras

- Nao sugerir refactoring se o codigo esta ok. Nao inventar problemas.
- Focar em problemas reais e actionable, nao em style nits.
- Quando revisar diffs, considerar o contexto do arquivo inteiro.

## Template do Report

```markdown
# Code Review: [arquivo ou PR]

## Resumo
[1-2 frases sobre a saude geral do codigo]

## Findings

### Critical

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

### Warning

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

### Info

| # | Problema | Localizacao | Sintomas | Refactoring Sugerido | Justificativa |
|---|----------|-------------|----------|---------------------|---------------|

## Design Patterns Recomendados
[So aparece se houver oportunidade real]

| Pattern | Onde Aplicar | Problema que Resolve | Como Aplicar |
|---------|-------------|---------------------|--------------|

## Pontos Positivos
[O que esta bem feito]
```

## Criterios de Severidade

- **Critical**: Bugs potenciais, violacoes de seguranca, code smells severos (God Class, Feature Envy grave, acoplamento perigoso)
- **Warning**: Code smells que impactam manutencao (Long Method, Duplicate Code, Primitive Obsession), oportunidades claras de refactoring
- **Info**: Melhorias opcionais, small smells, sugestoes de design patterns

## Base de Conhecimento

Toda a documentacao em `docs/backend-reviewer/refactoring.guru/` sera condensada nos 3 arquivos de reference:

- **code-smells.md**: 23 smells organizados em 5 categorias (Bloaters, OO Abusers, Change Preventers, Dispensables, Couplers) com sintomas, causas e tratamentos
- **refactoring.md**: 60+ tecnicas em 6 categorias (Composing Methods, Moving Features, Organizing Data, Simplifying Conditionals, Simplifying Method Calls, Dealing with Generalization)
- **design-patterns.md**: 22 patterns em 3 categorias (Creational, Structural, Behavioral) com sinais de quando aplicar
