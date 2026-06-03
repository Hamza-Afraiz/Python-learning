---
title: Observability
description: Logs vs metrics vs traces explained with diagrams — Prometheus, Grafana, OpenTelemetry, Jaeger and Loki — what each pillar answers and where to look first when something breaks.
sidebar:
  label: Observability
  order: 5
---

You can't fix what you can't see. Observability stands on **three pillars**, and
each answers a different question.

## The three pillars

```mermaid
flowchart TB
    subgraph Pillars
        L["📜 Logs<br/>WHAT happened"]
        M["📊 Metrics<br/>HOW MUCH / HOW FAST"]
        T["🧭 Traces<br/>WHERE the time went"]
    end
    L --> LQ["A specific error,<br/>filterable by user_id"]
    M --> MQ["Request rate, latency,<br/>error %, queue depth"]
    T --> TQ["One request's journey<br/>across services"]
```

| Pillar | Answers | Tool here |
|---|---|---|
| **Logs** | *What* happened, in detail | JSON logs → Loki → Grafana |
| **Metrics** | *How much / how fast*, in aggregate | Prometheus → Grafana |
| **Traces** | *Where* time was spent across services | OpenTelemetry → Jaeger |

## Why you need all three

Metrics tell you **"latency spiked at 2pm."** Traces tell you **"it spiked
inside the embedding step."** Logs tell you **"because the model failed to load
for user 123."** Each narrows the search; none replaces the others.

```mermaid
flowchart LR
    M["Metric: latency up 📈"] -->|"which request?"| T["Trace: slow span = embed step"]
    T -->|"why?"| L["Log: model load error, user 123"]
    style M fill:#16243a,stroke:#3b82f6
```

## How the stack wires up

```mermaid
flowchart TB
    APP["Application (FastAPI + workers)"]
    APP -->|"/metrics endpoint"| PROM[(Prometheus)]
    APP -->|"OTLP spans"| OTEL[OpenTelemetry Collector]
    APP -->|"JSON lines"| PROMTAIL[Promtail]
    OTEL --> JAEGER[(Jaeger)]
    PROMTAIL --> LOKI[(Loki)]
    PROM --> GRAF[Grafana]
    LOKI --> GRAF
    JAEGER --> GRAF
    GRAF --> YOU["📺 One dashboard"]
```

- **Prometheus** scrapes a `/metrics` endpoint and stores time-series.
- **OpenTelemetry** emits **spans**; **Jaeger** stores and visualizes traces.
- **Promtail** ships JSON logs into **Loki**.
- **Grafana** is the single pane of glass over all three.

## What a trace looks like

A trace is a **tree of spans** — each span is one operation, with timing. The
parent is the whole request; children are the steps inside it.

```mermaid
gantt
    title One request: POST /enrollments (trace)
    dateFormat X
    axisFormat %s
    section Request
    HTTP handler        :a, 0, 9
    section Steps
    Auth check          :0, 1
    DB transaction      :1, 4
    Publish outbox row  :4, 5
    Serialize response  :5, 6
```

## Where to look first when something breaks

```mermaid
flowchart TB
    S{Symptom?} -->|"Users report slowness"| A["Metrics: find the spike window"]
    A --> B["Traces: find the slow span"]
    B --> C["Logs: read the error in that span"]
    S -->|"Specific user error"| D["Logs: filter by user_id"]
    S -->|"Is it widespread?"| E["Metrics: error rate dashboard"]
```

Start broad (**metrics**), narrow to the request (**traces**), then read the
detail (**logs**). That order saves the most time.

→ Full walkthrough in the
[observability Q&A](/Python-learning/qa/session-4/).
