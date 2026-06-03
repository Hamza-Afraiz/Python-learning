---
title: Data & Storage
description: PostgreSQL vs MongoDB vs Cassandra explained with diagrams — what each database is built for, where each one breaks, and why analytics can live in PostgreSQL.
sidebar:
  label: Data & Storage
  order: 2
---

Choosing a database is about **failure modes**, not features. This guide shows
where each option shines and where it breaks.

## The three contenders at a glance

```mermaid
flowchart TB
    Q{What is the data shape?}
    Q -->|"Relational, needs ACID<br/>joins & transactions"| PG[(PostgreSQL)]
    Q -->|"Flexible documents,<br/>evolving schema"| MG[(MongoDB)]
    Q -->|"Massive write volume,<br/>time-series, multi-region"| CS[(Cassandra)]

    PG --> PGu["Users · Orders · Payments<br/>Analytics · Vector search"]
    MG --> MGu["Raw content blobs<br/>Loose metadata"]
    CS --> CSu["Billions of events/day<br/>IoT · clickstream"]
```

## Side-by-side

| | **PostgreSQL** | **MongoDB** | **Cassandra** |
|---|---|---|---|
| **Model** | Relational tables | JSON documents | Wide-column, partitioned |
| **Strength** | ACID, joins, constraints | Flexible schema | Linear write scaling |
| **Transactions** | Full multi-row ACID | Limited | Eventually consistent |
| **Joins** | Yes | Awkward | No |
| **Scales writes by** | Vertical + read replicas | Sharding | Adding nodes (built-in) |
| **Breaks when** | Single-node write ceiling | You need joins/ACID | You need ad-hoc queries/joins |
| **Best for here** | Core data + analytics | Optional content store | Not needed at this scale |

## Why analytics lives in PostgreSQL (not MongoDB)

A common instinct is "analytics = NoSQL." But here the analytics queries are
**relational aggregations** — counts, group-bys, joins across users and
orders. PostgreSQL does these natively and transactionally.

```mermaid
flowchart LR
    E["Order event"] --> PG[(PostgreSQL)]
    PG --> A1["COUNT orders<br/>GROUP BY product"]
    PG --> A2["JOIN users × orders"]
    PG --> A3["Window functions<br/>over time"]
    style PG fill:#16243a,stroke:#3b82f6
```

MongoDB *could* store the events, but you'd lose easy joins and transactional
counters — the exact things these queries need. So analytics stays in
PostgreSQL, in its own tables, updated by background consumers.

## Bonus: PostgreSQL also does vector search (pgvector)

The same database stores **embeddings** for semantic search — no separate vector
DB required at this scale.

```mermaid
flowchart LR
    L["Document text"] --> CH["Chunk<br/>~400 tokens"]
    CH --> EM["Embed<br/>384-dim vector"]
    EM --> V[("text_chunks<br/>vector(384)")]
    Qy["Search query"] --> EM2["Embed query"]
    EM2 --> V
    V -->|"ORDER BY embedding <=> $vec<br/>LIMIT 5"| R["Top-K chunks"]
```

This is the foundation for **semantic search** and **RAG** — finding the
paragraph that *means* the same thing as your query, not just one that shares
keywords.

→ See the Q&A for the full reasoning:
[storage decisions](/Python-learning/qa/session-1/) and
[chunks & embeddings](/Python-learning/qa/session-4/).
