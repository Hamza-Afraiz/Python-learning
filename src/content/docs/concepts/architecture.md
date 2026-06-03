---
title: System Architecture
description: A visual overview of a production-shaped backend — API, background workers, message brokers, workflow engine, and the databases behind them — and how a single request flows through it all.
sidebar:
  label: System Architecture
  order: 1
---

This guide gives you the **mental map** of a real backend system. Every other
guide zooms into one box on this diagram.

## The big picture

```mermaid
flowchart TB
    subgraph Client
        UI[Web Frontend]
    end

    subgraph Edge
        API[FastAPI / Uvicorn]
    end

    subgraph Async["Background Processing"]
        TMP[Temporal Worker<br/>multi-step workflows]
        CEL[Celery Worker<br/>fire-and-forget jobs]
        RELAY[Outbox Relay]
    end

    subgraph Brokers["Messaging Layer"]
        KAFKA[(Kafka<br/>event log)]
        RMQ[(RabbitMQ<br/>task queue)]
        REDIS[(Redis<br/>cache / results)]
    end

    subgraph Data["Storage Layer"]
        PG[(PostgreSQL<br/>core + analytics + pgvector)]
        MONGO[(MongoDB<br/>flexible documents)]
    end

    UI -->|HTTP| API
    API -->|read/write| PG
    API -->|start workflow| TMP
    API -->|write event row| PG
    RELAY -->|read outbox| PG
    RELAY -->|publish| KAFKA
    KAFKA -->|consume| CEL
    CEL -->|enqueue| RMQ
    TMP -->|chunk + embed| PG
    CEL -->|results| REDIS
```

## What each layer is responsible for

| Layer | Component | Job |
|---|---|---|
| **Edge** | FastAPI + Uvicorn | Handle HTTP, auth, validation. Returns fast. |
| **Workflow** | Temporal worker | Long, multi-step, *stateful* orchestration (e.g. publish a course → extract → chunk → embed). |
| **Tasks** | Celery worker | Independent fire-and-forget jobs (send email, generate PDF). |
| **Event log** | Kafka | Durable stream of *facts* (`course.published`) many consumers can replay. |
| **Task queue** | RabbitMQ | Broker that hands one job to one worker. |
| **Cache** | Redis | Fast ephemeral state and Celery result backend. |
| **Core data** | PostgreSQL | Users, courses, enrollments, analytics, and vector search. |
| **Documents** | MongoDB | Flexible, schema-light content where it fits. |

## How one request flows: enrolling in a course

```mermaid
sequenceDiagram
    participant U as User
    participant API as FastAPI
    participant PG as PostgreSQL
    participant OB as Outbox Relay
    participant K as Kafka
    participant C as Celery

    U->>API: POST /enrollments
    API->>PG: BEGIN (lock course row)
    API->>PG: insert enrollment + outbox row
    API->>PG: COMMIT
    API-->>U: 201 Created (fast)
    Note over OB,K: later, asynchronously
    OB->>PG: read unsent outbox rows
    OB->>K: publish "user.enrolled"
    K->>C: consumer picks it up
    C->>PG: update analytics counters
```

The key idea: **the user-facing write is fast and transactional**, while the
slow, fan-out work (analytics, notifications) happens **asynchronously** and is
guaranteed not to be lost — thanks to the *outbox* pattern.

## Why an "outbox" instead of publishing to Kafka directly

If the API wrote to PostgreSQL **and then** published to Kafka as two separate
steps, a crash in between would lose the event. Instead, the event is written as
a **row in the same database transaction** as the business data. A separate
**relay** process reads those rows and publishes them. Same transaction = no
lost events.

```mermaid
flowchart LR
    TX["One DB transaction"] --> A[business row]
    TX --> B[outbox row]
    B -.-> R[Relay] -.-> K[(Kafka)]
    style TX fill:#16243a,stroke:#3b82f6
```

→ Dive deeper in [Messaging & Events](/Python-learning/concepts/messaging/) and
the [Q&A sessions](/Python-learning/qa/session-1/).
