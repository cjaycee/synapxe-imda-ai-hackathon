export interface ActivityFeatures {
  observedHours: number;
  totalSteps: number;
  meanStepsPerSecond: number;
  activeSecondsFraction: number;
  standingFraction: number;
  sittingFraction: number;
  lyingFraction: number;
  offFraction: number;
  meanHr: number;
  stdHr: number;
  minHr: number;
  maxHr: number;
  meanVectorMagnitude: number;
  stdVectorMagnitude: number;
  axis1Std: number;
  axis2Std: number;
  axis3Std: number;
}

export interface MentalWellbeingPrediction {
  score: number;
  band: string;
  explanation: string;
}

const featureNames = [
  "observedHours",
  "totalSteps",
  "meanStepsPerSecond",
  "activeSecondsFraction",
  "standingFraction",
  "sittingFraction",
  "lyingFraction",
  "offFraction",
  "meanHr",
  "stdHr",
  "minHr",
  "maxHr",
  "meanVectorMagnitude",
  "stdVectorMagnitude",
  "axis1Std",
  "axis2Std",
  "axis3Std",
] as const;

const means = [
  18.468156565656564,
  12244.954545454546,
  0.1845100375812197,
  0.16478278407499045,
  0.3309507598871149,
  0.3079802263313902,
  0.13895243684730463,
  0.22211657693419032,
  75.4279986961293,
  15.85445698055039,
  23.318181818181817,
  206.5909090909091,
  34.687126450237145,
  66.752108240683,
  37.17535431064057,
  40.61259404664616,
  40.86856676825991,
];

const stds = [
  0.8229960806222091,
  3033.549967781113,
  0.04627006027353818,
  0.03873249557421454,
  0.05549299108384211,
  0.042832199451237535,
  0.03052506144270118,
  0.06177829243875979,
  6.17539235360784,
  4.598019719366647,
  17.290003322036497,
  31.374075996403448,
  6.963805040293128,
  9.385793907322947,
  5.467574616773239,
  8.765927115917037,
  4.555508087246261,
];

const weights = [
  -1.949919341558377,
  2.871109755852399,
  3.091046743690158,
  -1.4474688592967455,
  0.33303539130097404,
  0.0971946040996976,
  -2.0062857138688446,
  0.624779424864613,
  -0.6197094315781351,
  2.947708327078937,
  -0.40204801239715704,
  -1.6845084569180229,
  -3.6237916407616444,
  -0.8378505751609064,
  2.523465239130031,
  -3.79233605940591,
  1.4817354251465458,
];

const intercept = 62.79724336965718;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const bandForScore = (score: number) => {
  if (score < 20) return "very_low";
  if (score < 40) return "low";
  if (score < 60) return "moderate";
  if (score < 80) return "good";
  return "excellent";
};

export function predictMentalWellbeing(features: ActivityFeatures): MentalWellbeingPrediction {
  const vector = featureNames.map((name, i) => {
    const value = features[name];
    if (!Number.isFinite(value)) {
      throw new Error(`Missing or invalid feature: ${name}`);
    }
    return (value - means[i]) / stds[i];
  });

  let score = intercept;
  for (let i = 0; i < vector.length; i++) {
    score += weights[i] * vector[i];
  }
  score = clamp(score, 0, 100);
  const band = bandForScore(score);

  const explanation = `Predicted score ${score.toFixed(2)} (${band}) from activity features.`;

  return {
    score: Number(score.toFixed(2)),
    band,
    explanation,
  };
}