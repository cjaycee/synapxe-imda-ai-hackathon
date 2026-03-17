"""
Train a linear regression model relating environmental variables to mental health
(bienestar = wellbeing score, 1-10) and export coefficients as JSON for browser use.

Features mapped to UI fields:
  tmean_24h          -> temperatureC
  noise_total_LDEN_55 -> noiseDb proxy
  pm25bcn            -> airQualityAqi proxy
  precip_24h         -> weather precipitation
  no2bcn_24h         -> no2 (air quality component)
  sec_greenblue_day  -> green exposure (bonus for good air / light proxy)
"""

import json
import os
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..",
    "data", "environment",
    "CitieSHealth_BCN_DATA_PanelStudy_20220414.csv",
)
# Model coefficients are embedded in src/app/models/env_module/envLinearModel.ts
# Print artifact to stdout only; no file output needed.
OUT_DIR = None

# ── Load ─────────────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)

# Target: bienestar (wellbeing 1-10, higher = better mental health)
TARGET = "bienestar"

# Features that map onto the UI sliders / sensor values
FEATURE_MAP = {
    "tmean_24h": "temperatureC",
    "noise_total_LDEN_55": "noiseLden",
    "pm25bcn": "pm25",
    "no2bcn_24h": "no2",
    "precip_24h": "precipMm",
    "sec_greenblue_day": "greenBlueExposureSec",
}
FEATURES = list(FEATURE_MAP.keys())

# Keep rows that have all required columns non-null
use_cols = [TARGET] + FEATURES
clean = df[use_cols].dropna()
print(f"Rows after dropping NaN: {len(clean)} / {len(df)}")

X = clean[FEATURES].values
y = clean[TARGET].astype(float).values

# ── Train ─────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

model = LinearRegression()
model.fit(X_train_s, y_train)

y_pred = model.predict(X_test_s)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
print(f"R²: {r2:.4f}   MAE: {mae:.4f}")

# ── Export coefficients as JSON ───────────────────────────────────────────────
# The JS side will:  score = intercept + sum(coef[i] * (x[i] - mean[i]) / std[i])
# Then scale from [1-10] to [0-100] for display.

artifact = {
    "description": "Linear regression: environmental features -> bienestar (1-10)",
    "target": TARGET,
    "featureNames": [FEATURE_MAP[f] for f in FEATURES],  # JS-friendly names
    "rawFeatureNames": FEATURES,
    "intercept": float(model.intercept_),
    "coefficients": [float(c) for c in model.coef_],
    "scalerMean": [float(m) for m in scaler.mean_],
    "scalerStd": [float(s) for s in scaler.scale_],
    "targetMin": 1.0,
    "targetMax": 10.0,
    "metrics": {"r2": round(r2, 4), "mae": round(mae, 4)},
    "trainRows": int(len(X_train)),
}

print("\nModel artifact (paste into envLinearModel.ts if retraining):")
print(json.dumps(artifact, indent=2))
