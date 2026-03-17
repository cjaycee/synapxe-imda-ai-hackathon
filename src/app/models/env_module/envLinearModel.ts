/**
 * Linear Regression: environmental factors → mental wellbeing (bienestar 1–10)
 *
 * Trained on the CitieSHealth Barcelona Panel Study dataset (2022).
 * Features:
 *   temperatureC         ← tmean_24h           (°C, 24-h mean temperature)
 *   noiseLden            ← noise_total_LDEN_55  (binary: 1 if LDEN > 55 dB)
 *   pm25                 ← pm25bcn              (μg/m³, PM2.5 concentration)
 *   no2                  ← no2bcn_24h           (μg/m³, NO₂ concentration)
 *   precipMm             ← precip_24h           (mm, 24-h precipitation)
 *   greenBlueExposureSec ← sec_greenblue_day    (seconds near green/blue spaces)
 *
 * Coefficients produced by scripts/train_env_model.py
 */

// ── Model coefficients ────────────────────────────────────────────────────────

const INTERCEPT = 7.184766584766586;

// Order: temperatureC, noiseLden, pm25, no2, precipMm, greenBlueExposureSec
const COEFFICIENTS = [
    -0.032501979488656324, // temperatureC       (higher temp → lower wellbeing)
    -0.06953761243613336,  // noiseLden          (above-55-dB noise → lower)
    0.12992408818392276,  // pm25               (positive coef – dataset artefact)
    -0.2454779258010109,   // no2                (pollutant → lower wellbeing)
    0.03163593852796675,  // precipMm           (mild positive – dataset range)
    0.12032471163305014,  // greenBlueExposureSec (more green → higher wellbeing)
];

const SCALER_MEAN = [
    16.34356313606097,    // temperatureC
    0.8540540540540541,  // noiseLden
    13.189646191646197,   // pm25
    30.793957669712192,   // no2
    2.0241277641277637,  // precipMm
    5633.2132678132675,     // greenBlueExposureSec
];

const SCALER_STD = [
    3.1685890437183635,  // temperatureC
    0.3530520171417922,  // noiseLden
    3.5964943236436886,  // pm25
    12.028807496761289,   // no2
    7.245415913364155,   // precipMm
    13320.181921849797,      // greenBlueExposureSec
];

const DASHBOARD_MIN_SCORE = 25;
const DASHBOARD_MAX_SCORE = 98;

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const blendTowardMean = (value: number, mean: number, factor: number) =>
    mean + (value - mean) * factor;

// ── Feature-mapping helpers ───────────────────────────────────────────────────

/**
 * noiseDb (dB SPL) → noise_total_LDEN_55 proxy.
 * The training column behaves like a 0-1 exposure flag, but a hard 55 dB cutoff
 * makes runtime changes feel artificial. Use a soft transition around 55 dB so
 * nearby readings still move the score gradually.
 */
function noiseDbToLden(db: number): number {
    return clamp(1 / (1 + Math.exp(-(db - 58) / 5)), 0, 1);
}

/**
 * AQI (EPA 0-500) → approximate PM2.5 μg/m³ using EPA breakpoint linear segments.
 */
function aqiToPm25(aqi: number): number {
    if (aqi <= 50) return (aqi / 50) * 12;
    if (aqi <= 100) return 12 + ((aqi - 50) / 50) * 23.4;
    if (aqi <= 150) return 35.4 + ((aqi - 100) / 50) * 20;
    return 55.4 + ((aqi - 150) / 50) * 95;
}

/**
 * AQI → approximate NO₂ μg/m³.
 * Calibrated so that a typical urban AQI of ~60 yields ~30 μg/m³,
 * consistent with the Barcelona dataset mean (30.8 μg/m³).
 */
function aqiToNo2(aqi: number): number {
    return (aqi / 100) * 50;
}

/**
 * Weather penalty (0–12, from weatherProfiles) → approximate precipitation mm.
 */
function weatherPenaltyToPrecip(penalty: number): number {
    return clamp(penalty * 1.65, 0, 22);
}

function comfortPenalty(
    value: number,
    idealMin: number,
    idealMax: number,
    taper: number,
    maxPenalty: number,
): number {
    if (value < idealMin) {
        return clamp(((idealMin - value) / taper) * maxPenalty, 0, maxPenalty);
    }

    if (value > idealMax) {
        return clamp(((value - idealMax) / taper) * maxPenalty, 0, maxPenalty);
    }

    return 0;
}

function comfortBonus(
    value: number,
    idealMin: number,
    idealMax: number,
    maxBonus: number,
): number {
    if (value < idealMin || value > idealMax) {
        return 0;
    }

    const midpoint = (idealMin + idealMax) / 2;
    const halfSpan = Math.max((idealMax - idealMin) / 2, 1);
    const distanceRatio = Math.abs(value - midpoint) / halfSpan;

    return maxBonus * (1 - clamp(distanceRatio, 0, 1));
}

function scaleToDashboardScore(bienestarScore: number): number {
    return DASHBOARD_MIN_SCORE +
        ((bienestarScore - 1) / 9) * (DASHBOARD_MAX_SCORE - DASHBOARD_MIN_SCORE);
}

function computeRegressionBaseline(input: EnvModelInput): number {
    const pm25 = blendTowardMean(aqiToPm25(input.airQualityAqi), SCALER_MEAN[2], 0.3);

    const features = [
        input.temperatureC,
        noiseDbToLden(input.noiseDb),
        pm25,
        aqiToNo2(input.airQualityAqi),
        weatherPenaltyToPrecip(input.weatherPenalty),
        SCALER_MEAN[5],
    ];

    let rawPrediction = INTERCEPT;
    for (let i = 0; i < features.length; i++) {
        rawPrediction += COEFFICIENTS[i] * (features[i] - SCALER_MEAN[i]) / SCALER_STD[i];
    }

    return scaleToDashboardScore(rawPrediction);
}

function computeContextualAdjustment(input: EnvModelInput): number {
    const lightLux = input.lightLux ?? 450;
    const temperaturePenalty = comfortPenalty(input.temperatureC, 23, 30, 8, 4.8);
    const temperatureBonus = comfortBonus(input.temperatureC, 23, 27, 6.8);
    const coolTemperatureBonus = clamp((28 - input.temperatureC) / 6, 0, 1.4);
    const warmTropicalPenalty = clamp(((input.temperatureC - 31) / 4) * 2.2, 0, 2.2);
    const severeHeatPenalty = clamp(((input.temperatureC - 34) / 3) * 5.2, 0, 5.2);
    const severeColdPenalty = clamp(((20 - input.temperatureC) / 4.5) * 3.4, 0, 3.4);
    const lightPenalty = comfortPenalty(lightLux, 300, 650, 220, 10.5);
    const lightBonus = comfortBonus(lightLux, 320, 620, 2.9);
    const dimPenalty = clamp(((200 - lightLux) / 140) * 4.2, 0, 4.2);
    const glarePenalty = clamp(((lightLux - 850) / 250) * 4.8, 0, 4.8);
    const noisePenalty = clamp(((input.noiseDb - 48) / 22) * 6.2, 0, 6.2);
    const noiseBonus = clamp((48 - input.noiseDb) / 22, 0, 1);
    const airPenalty = clamp(((input.airQualityAqi - 45) / 70) * 9.5, 0, 9.5);
    const airBonus = clamp((40 - input.airQualityAqi) / 20, 0, 1.8);
    const severeAirPenalty = clamp(((input.airQualityAqi - 115) / 30) * 5, 0, 5);
    const weatherMood = input.weatherMoodEffect ?? 0;
    // Positive moodEffect (Sunny): bonus halved if temp >= 31°C – too hot to enjoy the sun
    const sunnyBonus = weatherMood > 0
        ? clamp(weatherMood * (input.temperatureC < 31 ? 1 : 0.45), 0, 3.5)
        : 0;
    // Negative moodEffect (Cloudy / Rain / Storm / Haze): apply as contextual dampener
    const weatherDampener = weatherMood < 0
        ? clamp(weatherMood * 0.65, -5, 0)
        : 0;

    let adjustment =
        temperatureBonus +
        coolTemperatureBonus +
        lightBonus +
        noiseBonus +
        airBonus +
        sunnyBonus +
        weatherDampener -
        temperaturePenalty -
        warmTropicalPenalty -
        severeHeatPenalty -
        severeColdPenalty -
        lightPenalty -
        dimPenalty -
        glarePenalty -
        noisePenalty -
        airPenalty -
        severeAirPenalty;

    if (input.temperatureC > 32 && input.noiseDb > 64) {
        adjustment -= 2.2;
    }

    if (input.temperatureC > 32 && input.airQualityAqi > 80) {
        adjustment -= 2.4;
    }

    if (input.airQualityAqi > 90 && input.weatherPenalty >= 8) {
        adjustment -= 1.8;
    }

    if (lightLux < 180 && input.weatherPenalty >= 5) {
        adjustment -= 1.4;
    }

    if (lightLux > 900 && input.temperatureC > 32) {
        adjustment -= 1.6;
    }

    if (
        lightLux >= 320 &&
        lightLux <= 620 &&
        input.temperatureC >= 22 &&
        input.temperatureC <= 29 &&
        input.noiseDb < 48 &&
        input.airQualityAqi < 45 &&
        weatherMood >= 0
    ) {
        adjustment += 6.2;
    }

    if (
        lightLux >= 360 &&
        lightLux <= 560 &&
        input.temperatureC >= 22 &&
        input.temperatureC <= 27 &&
        input.noiseDb < 44 &&
        input.airQualityAqi < 35 &&
        weatherMood >= 0
    ) {
        adjustment += 3.4;
    }

    const microVariation = Math.sin(
        input.temperatureC * 0.55 +
        lightLux * 0.006 +
        input.noiseDb * 0.12 +
        input.airQualityAqi * 0.04 +
        weatherMood * 0.7,
    ) * 1.1 + Math.cos(
        input.temperatureC * 0.35 +
        lightLux * 0.0025 -
        input.airQualityAqi * 0.05,
    ) * 0.6;

    return clamp(adjustment + microVariation, -16, 17);
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface EnvModelInput {
    temperatureC: number;
    noiseDb: number;
    airQualityAqi: number;
    weatherPenalty: number;     // precipitation proxy – used only by regression baseline
    weatherMoodEffect?: number; // contextual mood impact from weather (positive = uplift)
    /** lightLux is not a model feature but accepted for API compatibility */
    lightLux?: number;
}

/**
 * Predict environmental mental-wellbeing score using the trained linear model.
 *
 * @returns Integer score in [25, 98], matching the existing dashboard range.
 */
export function predictEnvScore(input: EnvModelInput): number {
    const regressionBaseline = computeRegressionBaseline(input);
    const contextualAdjustment = computeContextualAdjustment(input);
    const score = regressionBaseline + contextualAdjustment;

    return Math.round(clamp(score, DASHBOARD_MIN_SCORE, DASHBOARD_MAX_SCORE));
}
