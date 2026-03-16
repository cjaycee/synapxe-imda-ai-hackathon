# Multimodal Health & Wellness Dashboard — Figma Make Prompt

Build a modern, clean **web app dashboard** for an **AI-powered multimodal remote health and wellness monitoring platform**.

The design should feel:
- trustworthy
- privacy-first
- transparent
- modern
- slightly clinical but still warm and human

Use a **desktop dashboard layout** with clear hierarchy, rounded cards, soft shadows, and a calm health-tech style.

---

## Overall product concept

This platform tracks a user’s health and wellness through multiple data sources:
- facial data from phone/computer camera during short consented tracking windows
- speech/audio data during short consented tracking windows
- environmental noise levels
- daily mood and wellbeing check-ins
- wearable data

The system combines these into:
- an **Overall Health Score**
- separate scores for each tracked health domain
- transparent logs of collected data
- a chatbot that explains the user’s health insights

The interface must emphasize:
- **user autonomy**
- **full transparency**
- **ability to toggle tracking on/off**
- **easy access to captured data**
- **privacy and security controls**

---

## Main dashboard layout

Create a **single main dashboard screen** with the following sections in order:

### 1. Top navigation bar
Include:
- platform logo on the left
- page title: **Health Dashboard**
- a search bar or empty spacer in the middle
- a **Settings** button/icon on the right
- optional user avatar on the far right

Style:
- clean horizontal navbar
- white or very light background
- subtle border at bottom

---

### 2. Hero section: Overall Health Score
At the top of the dashboard, create a prominent hero card showing:

- title: **Overall Health Score**
- large main score, example: **82 / 100**
- health status label, example: **Good & Stable**
- weekly trend, example: **+3 this week**
- a circular progress indicator or elegant score visualization
- a short one-line AI summary, example:  
  **“Your overall health appears stable, with strong cardiovascular recovery and moderate stress levels.”**

Style:
- large card spanning most of the page width
- strong visual emphasis
- calm blue/green health-tech palette
- premium analytics dashboard feel

---

### 3. Four health tracking modules
Below the hero section, create a **2 x 2 grid** of clickable dashboard cards.

Each card represents one tracked health domain:

1. **Mental & Emotional Health**
2. **Physiological Signals**
3. **Sleep & Activity**
4. **Cardiovascular & Early Illness Detection**

Each card should contain:
- a relevant icon
- module title
- a score or status number
- a short subtitle/status
- a **toggle switch** to turn tracking on/off
- a **View Details** button or link

Use example content like:

#### Mental & Emotional Health
- Score: 78
- Subtitle: “Mild stress detected”
- Toggle: ON

#### Physiological Signals
- Score: 85
- Subtitle: “Heart rate and respiration stable”
- Toggle: ON

#### Sleep & Activity
- Score: 72
- Subtitle: “Sleep quality below weekly average”
- Toggle: OFF

#### Cardiovascular & Early Illness Detection
- Score: 88
- Subtitle: “Recovery signals look normal”
- Toggle: ON

Important:
- make each card look clickable
- toggles must be visually obvious
- cards should balance medical credibility with consumer-friendly design

---

### 4. Facial data transparency module
Below the four health modules, create a card titled:

**Facial Tracking Logs**

This section should allow users to review screenshots captured during facial-data tracking sessions.

Include:
- a grid of thumbnail screenshots
- timestamps below or overlaid on thumbnails
- a **View All** button
- short privacy note like:  
  **“Only consented captures are stored and visible to you.”**

This section should visually communicate transparency and trust.

---

### 5. AI Health Assistant card or floating panel
Add a visible chatbot entry point.

Options:
- a floating action button at bottom right
- or a dashboard card called **AI Health Assistant**

This assistant should:
- answer questions about the user’s health data
- explain score changes
- provide supportive recommendations
- feel empathetic and helpful

Example suggested prompts in the UI:
- “Why did my score drop this week?”
- “How is my stress level changing?”
- “What should I improve for better sleep?”

Use a polished conversational AI interface style.

---

### 6. Settings / privacy entry point
The dashboard should clearly show access to settings.

Settings should conceptually include:
- username / profile
- password and security
- privacy controls
- tracking permissions
- data export
- delete captured logs

You do not need to fully design the settings page in detail on the main screen, but make the **Settings** button visually clear and important.

---

## Visual style guidelines

Use:
- rounded cards
- soft shadows
- generous spacing
- clear typography
- modern health-tech UI
- minimal clutter
- cool, calming color palette

Suggested palette:
- deep blue
- teal
- soft green
- white
- light gray backgrounds

Avoid:
- dark cyberpunk look
- overly playful cartoon style
- overwhelming medical complexity
- too many bright colors

The design should look like a polished startup prototype suitable for:
- hackathon demo
- investor pitch
- healthcare innovation challenge

---

## Functional ideas to reflect in the UI

The UI should imply that:
- each data source has its own AI model or processing pipeline
- users can control exactly what gets tracked
- users can inspect raw or captured data
- the platform combines multiple modalities into a single overall score
- the system is privacy-conscious and transparent

---

## Optional details to enhance realism

If useful, add:
- small trend graphs
- tiny “last updated” labels
- privacy badges
- confidence indicators
- status chips such as **Tracking Active**, **Paused**, **Review Needed**
- one-line AI explanations beneath scores

---

## Output goal

Generate a **clean high-fidelity dashboard mockup** for this product.

The final screen should feel like a real startup web app for **AI-powered multimodal health monitoring**, with strong emphasis on:
- overall health score
- four health condition modules
- tracking toggles
- screenshot review for facial tracking
- settings and user control
- AI health assistant
