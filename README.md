# Sigcore
Sigcore emits events/data: “message received”, “call ended”, “delivery failed”, “transcript ready”, “workflow progressed”
Below is a **ready-to-paste README description** for **Sigcore**.
It is **business-logic focused**, not technical, and is written to help humans (and AI agents) understand **what Sigcore is responsible for and why it exists**.

You can drop this directly into `README.md`.

---

# Sigcore

## Purpose

**Sigcore is the headless communication platform that powers Callio and other products.**

It centralizes all communication logic, provider integrations, compliance, routing, workflows, and usage metering across channels such as voice, SMS, WhatsApp, and future messaging tools.

Sigcore exists to ensure that:

* communication behavior is consistent across products
* providers can be swapped or combined without changing product code
* business logic lives in one place
* customer-facing apps remain simple and UI-focused

Sigcore is **not a product UI** and is **not user-facing**.
It is a **system of record and execution layer** for all communications.

---

## What Sigcore Is

Sigcore is a **channel-agnostic communication engine** that:

* receives inbound communication events
* executes outbound communication commands
* enforces business rules and compliance
* tracks outcomes and usage
* exposes normalized data to client applications

Sigcore is designed to support **multiple products, multiple tenants, and multiple communication providers** simultaneously.

---

## What Sigcore Is Not

Sigcore does **not**:

* provide inbox or dialer UI
* manage human workflows or UX
* contain product-specific features
* expose provider-specific APIs to client apps
* require users to understand channels, campaigns, or workflows

All human interaction belongs in product applications (e.g., Callio).

---

## Core Responsibilities

### 1. Channel Abstraction

Sigcore provides a unified abstraction over communication channels, including:

* Voice
* SMS
* WhatsApp
* Other future channels (email, social, etc.)

Each channel is implemented as an internal adapter that:

* translates inbound provider payloads into Sigcore events
* translates Sigcore commands into provider API calls
* reports delivery, failure, and status updates

Client apps never interact with providers directly.

---

### 2. Canonical Communication Model

Sigcore owns the canonical data model for:

* conversations
* messages
* calls
* call recordings
* transcripts
* delivery receipts
* conversation timelines

All inbound and outbound communication is normalized into a single event stream so that:

* products do not depend on provider schemas
* analytics and automation work consistently
* behavior can be analyzed independently of channel

---

### 3. Event Ingestion and Normalization

Sigcore is the single entry point for:

* provider webhooks
* inbound messages
* inbound calls
* call lifecycle events
* recording/transcript availability

All incoming data is:

* validated
* normalized
* associated with the correct tenant
* stored as canonical events

---

### 4. Routing and Policy Enforcement

Sigcore decides **how** and **where** communication is sent.

This includes:

* channel selection (e.g., WhatsApp vs SMS fallback)
* number selection
* business hours enforcement
* retry and fallback logic
* escalation rules

Client applications may configure preferences, but Sigcore enforces them.

---

### 5. Workflow and State Management

Sigcore supports **stateful communication workflows**, including:

* waiting for specific responses (yes/no, confirmation)
* timeouts and retries
* conditional branching
* escalation paths
* automated follow-ups

This logic is channel-agnostic and can be reused across products.

Sigcore executes workflows; products only observe outcomes.

---

### 6. Compliance and Gating

Sigcore enforces all compliance-related rules, including:

* A2P campaign registration
* number-to-campaign mapping
* opt-in / opt-out enforcement
* provider-specific restrictions
* blocking or delaying sends when requirements are not met

Products never bypass compliance logic.

---

### 7. Number Lifecycle Management

Sigcore owns:

* number provisioning and pooling
* number assignment to tenants or users
* number capability tracking
* provider association (which number belongs to which provider)
* number availability and status

Products only display and select numbers; Sigcore controls ownership.

---

### 8. Usage Metering and Cost Tracking

Sigcore records all billable activity, including:

* messages sent/received
* call minutes
* recordings
* transcriptions
* workflow executions

It produces:

* usage summaries
* billing-grade events
* internal cost attribution

Products consume usage data but do not calculate it.

---

### 9. Multi-Tenant Isolation

Sigcore guarantees:

* strict tenant isolation
* correct association of events to tenants
* prevention of cross-tenant data leakage
* safe reuse of shared infrastructure (number pools, providers)

---

## Relationship to Products

### Callio

Callio is a **customer-facing phone product** built on top of Sigcore.

* Callio renders conversations, calls, and messages
* Callio issues commands (send message, place call)
* Sigcore executes and reports results
* Callio never talks to providers directly

### Other Products (e.g., LeadBridge, BehaviorOS)

Other products use Sigcore to:

* send and receive communications
* observe outcomes
* analyze behavior
* automate interactions

Sigcore enables multiple products to share the same communication backbone.

---

## Design Principles

* **Headless first**: no UI assumptions
* **Channel-agnostic**: logic must work across channels
* **Event-driven**: events are the source of truth
* **Single enforcement point**: all rules live here
* **Product-independent**: no product-specific logic
* **Replaceable providers**: no vendor lock-in

---

## One-Sentence Summary

**Sigcore is the centralized communication engine that executes, enforces, and records all communication behavior across channels, while products like Callio focus purely on user experience.**

---

If you want, next I can:

* compress this into a **1-page architecture summary**
* generate a **“Sigcore vs Callio” boundary checklist**
* or rewrite this in a more **formal / enterprise README style**
