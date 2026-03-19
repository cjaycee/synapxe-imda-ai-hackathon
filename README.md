# 🌿 MindPulse — Your Mental Energy, Decoded.

MindPulse is a next-generation mental wellness dashboard built for ambitious students and driven professionals who want clarity, not clutter.

It transforms everyday health signals into one simple, powerful Overall MindPulse Score — backed by trends, insights, and AI-supported recommendations you can actually use.

No overwhelming charts.  
No clinical jargon.  
Just clear signals, smart summaries, and actionable next steps.

---

## Quick Start

The dashboard AI chatbox uses SEA-LION chat completions and reads tracked module data (visual, activity, sleep, environmental, and module scores).

Create a local env file:

```bash
cp .env.example .env.local
```

Add the following values in `.env.local`:

```bash
VITE_SEALION_API_KEY=your_sea_lion_api_key
VITE_SEALION_MODEL=aisingapore/Llama-SEA-LION-v3.5-70B-R
VITE_SEALION_BASE_URL=https://api.sea-lion.ai/v1
```

Then run:

```bash
npm i
```

```bash
npm run dev
```

Important security note: any `VITE_*` variable is bundled into frontend code and visible to users. This is acceptable for local testing, but production deployments should move SEA-LION requests behind a backend proxy to protect API keys and enforce server-side rate limits.

## 🚀 What MindPulse Does

MindPulse helps you understand how your **sleep, stress, recovery, and daily routines** are shaping your mental performance.

Instead of forcing you to interpret fragmented data across multiple apps, it:

- 🔗 Combines multimodal signals into one cohesive dashboard  
- 📊 Converts complex metrics into a single, easy-to-read mental health score  
- 🤖 Delivers short AI-generated insights and practical suggestions  
- 🔍 Lets you drill down into detailed modules for deeper context  
- 🔒 Keeps privacy transparent with visible consent logs and local-first processing  

It doesn’t just track your wellbeing — it explains it.

---

# 🧠 Core Experience

At the center of MindPulse is a dynamic **Overall MindPulse Score** — a live reflection of how your routines, signals, and surroundings influence your mind.

Behind that score are four core modules and two supporting experiences:

---

## 👁️ 1. Visual Signals

Camera-based, consent-driven analysis provides insights into:

- Dominant facial emotion and confidence  
- Stress estimation from expression patterns  
- Rolling wellness snapshots across 1 min, 15 min, 30 min, 1 hour, 12 hours, and 1 day windows  

All visual processing runs locally in real time, with privacy controls built in.  
This module turns passive facial cues into meaningful awareness without adding friction.

---

## 🚶 2. Activity Wellbeing

Movement patterns are a strong predictor of mental energy.

This module tracks:

- Daily step count  
- Mean heart rate  
- Active-time percentage  

A model converts activity features into a mental wellbeing score so users can quickly see whether their routine is supporting recovery and focus.

---

## 😴 3. Sleep Readings

Recovery quality drives next-day clarity and resilience.

This module tracks:

- Time asleep  
- Sleep heart-rate profile  
- Overnight movement and restlessness  
- Predicted sleep quality score with confidence  

It combines dataset-informed modeling with realistic generated inputs to produce practical sleep insights that are easy to act on.

---

## 🌤️ 4. Environmental Context

Your environment affects cognitive load and emotional regulation.

This module tracks:

- Temperature  
- Ambient noise  
- Air quality (AQI)  
- Weather-related mood effects  

A regression-based environment model translates these factors into an environmental wellbeing score and trend.

---

## 📝 Supporting Experience: Daily Pulse Check-In & Reflection Log

MindPulse includes a daily self-check-in to capture how users feel beyond sensor data.

Users can:

- Submit one check-in per day for mood, stress, and energy  
- Add an optional short reflection and keep it stored locally  
- Review reflection history over time  

This check-in also contributes to the **Overall MindPulse Score**, so subjective wellbeing is reflected alongside passive health signals.

---

## 🤖 Supporting Experience: AI Health Assistant

The assistant interprets dashboard context across enabled modules and gives concise, practical guidance.

It helps users:

- Explain why your score changed  
- Connect patterns across modules  
- Suggest realistic, safe improvements  
- Reflect on trends and practical next steps  

It feels less like a report — and more like guidance.

---

# 🎯 Who It’s For

MindPulse is designed for:

- 📚 Students balancing deadlines, sleep, and emotional wellbeing  
- 💼 Working adults managing energy across demanding schedules  
- ⚡ High-performers who want clarity without micromanaging metrics  

If you care about performance, recovery, and mental clarity — this is for you.

---

# 💡 Why It Works

Most wellness tools show data.  
MindPulse shows meaning.

It reframes mental wellbeing as something dynamic — shaped daily by stress, sleep, recovery, and physiology.

Instead of a static survey score, you get a living signal.

Instead of fragmented dashboards, you get one coherent picture.

Instead of anxiety about your metrics, you get calm, actionable insight.

---

## 🌱 Positioning

A privacy-aware mental wellness dashboard that converts everyday health signals into a simple score and practical insights for students and professionals.

---

MindPulse doesn’t diagnose.  
It empowers.

---


And in a world of burnout, overload, and constant noise — that clarity is powerful.
