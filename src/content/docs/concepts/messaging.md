---
title: Messaging & Events
description: Kafka vs RabbitMQ vs Celery vs Temporal, explained with diagrams. Message brokers, event logs, task queues and workflow engines — what each layer does and how they compose.
sidebar:
  label: Messaging & Events
  order: 3
---

These four tools get confused constantly. They live at **different layers** and
solve **different problems**. This guide separates them for good.

## One sentence each

| Tool | What it really is |
|---|---|
| **RabbitMQ** | A **message broker** — queues and routing. One consumer takes a message and it's gone. |
| **Kafka** | A **distributed event log** — durable facts in topics, replayable by many consumers. |
| **Celery** | A **task framework** — workers that run discrete jobs pulled from a broker. |
| **Temporal** | A **workflow engine** — durable, multi-step, stateful orchestration with retries. |

## Queue vs Log: the core distinction

```mermaid
flowchart TB
    subgraph RabbitMQ["RabbitMQ — a QUEUE"]
        P1[Producer] --> Q[/Queue/]
        Q --> W1[Worker A]
        Q -. "message consumed,<br/>then deleted" .-> X((gone))
    end

    subgraph Kafka["Kafka — a LOG"]
        P2[Producer] --> T[(Topic: append-only)]
        T --> C1["Consumer group 1<br/>offset: 42"]
        T --> C2["Consumer group 2<br/>offset: 17"]
        T --> C3["New consumer<br/>can replay from 0"]
    end
```

- **RabbitMQ**: a kitchen order ticket — the next cook grabs **one** job and it
  leaves the rail.
- **Kafka**: a bank ledger line — everyone can **read** it, each team keeps its
  own bookmark (offset), and new readers can replay history.

## Where Celery fits

Celery is **not** a broker. It's a framework: your code **publishes** a task
message to a broker (usually RabbitMQ), and separate **Celery worker** processes
consume and run it.

```mermaid
flowchart LR
    API["API (Celery client)"] -->|"task.delay()"| RMQ[(RabbitMQ broker)]
    RMQ --> CW1[Celery worker 1]
    RMQ --> CW2[Celery worker 2]
    CW1 --> RES[(Redis<br/>result backend)]
    CW2 --> RES
```

## Where Temporal fits

Temporal is for **multi-step, stateful** work that must survive crashes and
retry individual steps. A **server** stores the workflow history; **workers**
poll a task queue and run workflow + activity code.

```mermaid
sequenceDiagram
    participant API
    participant TS as Temporal Server
    participant W as Worker
    participant DB as PostgreSQL

    API->>TS: start_workflow("publish course")
    TS->>W: schedule workflow task
    W->>W: orchestrate steps (deterministic)
    W->>DB: activity: extract text
    W->>DB: activity: chunk + embed (retried on failure)
    W->>DB: activity: store vectors
    W->>TS: workflow complete
    Note over TS: full history is durable & replayable
```

If a single activity fails, Temporal **retries just that step** — without
re-running the whole workflow. That's the difference from a plain task queue.

## How they compose (they don't replace each other)

```mermaid
flowchart LR
    APP[Application] -->|"facts"| K[(Kafka)]
    K -->|consume| BR["Celery bridge<br/>consumer"]
    BR -->|"enqueue job"| RMQ[(RabbitMQ)]
    RMQ --> CEL[Celery workers]
    APP -->|"saga / publish"| TMP[Temporal]
```

A typical real system uses **all of them**: Kafka for durable events, a consumer
that bridges events into **Celery tasks** via **RabbitMQ**, and **Temporal** for
the complex orchestrations. They complement; none is a drop-in replacement for
the others.

→ Full discussion in the
[Temporal & brokers Q&A](/Python-learning/qa/session-3/) and
[outbox & idempotency](/Python-learning/qa/session-4/).
