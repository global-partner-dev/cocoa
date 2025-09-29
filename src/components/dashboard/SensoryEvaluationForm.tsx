import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useTranslation } from "react-i18next";

// Types for the demo
export interface SensoryMeta {
  evaluationDate?: string; // YYYY-MM-DD
  evaluationTime?: string; // HH:mm
  evaluatorName?: string;
  sampleCode?: string;
  sampleNotes?: string;
  evaluationType?: 'cocoa_mass' | 'chocolate';
}

export interface SensoryScores {
  // Single-value attributes (0-10)
  cacao: number; // Cacao
  bitterness: number; // Bitterness
  astringency: number; // Astringency
  caramelPanela: number; // Caramel / Panela (simple value)

  // Calculated group totals (0-10)
  acidityTotal: number; // Acidity (Total) = avg(frutal, acetic, lactic, mineralButyric)
  freshFruitTotal: number; // Fresh Fruit (Total) = avg(berries, citrus, yellowPulp, dark, tropical)
  brownFruitTotal: number; // Brown Fruit (Total) = avg(dry, brown, overripe)
  vegetalTotal: number; // Vegetal (Total) = avg(grassHerb, earthy)
  floralTotal: number; // Floral (Total) = avg(orangeBlossom, flowers)
  woodTotal: number; // Wood (Total) = avg(light, dark, resin)
  spiceTotal: number; // Spice (Total) = avg(spices, tobacco, umami)
  nutTotal: number; // Nut (Total) = avg(kernel, skin)
  roastDegree: number; // Roast Degree (simple value)
  defectsTotal: number; // Defects (Total) = sum of all defects

  // Sub-attributes used to compute totals (0-10)
  acidity: { frutal: number; acetic: number; lactic: number; mineralButyric: number };
  freshFruit: { berries: number; citrus: number; yellowPulp: number; dark: number; tropical: number };
  brownFruit: { dry: number; brown: number; overripe: number };
  vegetal: { grassHerb: number; earthy: number };
  floral: { orangeBlossom: number; flowers: number };
  wood: { light: number; dark: number; resin: number };
  spice: { spices: number; tobacco: number; umami: number };
  nut: { kernel: number; skin: number };

  // Defects (0-10)
  defects: {
    dirty: number; animal: number; rotten: number; smoke: number; humid: number; moldy: number; overfermented: number; other: number;
  };
  // Additional (chocolate evaluation)
  sweetness?: number; // Sweetness (chocolate only)
  textureNotes?: string;
  // Aggregates
  overallQuality?: number; // 0-10
}

export interface SensoryVerdict {
  result: 'Approved' | 'Disqualified';
  reasons?: string[]; // reasons text
  otherReason?: string;
}

export interface SensoryEvaluationResult {
  meta: SensoryMeta;
  scores: SensoryScores;
  comments: {
    flavorComments?: string;
    producerRecommendations?: string;
    additionalPositive?: string;
  };
  verdict: SensoryVerdict;
}

export interface SensoryEvaluationFormProps {
  metaDefaults: Partial<SensoryMeta>;
  initialData?: SensoryEvaluationResult; // Existing evaluation data to load
  referenceImageUrl?: string; // Optional flavor wheel reference image
  onCancel?: () => void;
  onSubmit?: (result: SensoryEvaluationResult) => void;
}

// Utility to clamp and format numbers
const clamp01 = (v: number) => Math.max(0, Math.min(10, v));

const defaultScores: SensoryScores = {
  cacao: 5, bitterness: 5, astringency: 5, caramelPanela: 5,
  acidityTotal: 0, freshFruitTotal: 0, brownFruitTotal: 0, vegetalTotal: 0, floralTotal: 0, woodTotal: 0, spiceTotal: 0, nutTotal: 0, roastDegree: 0, defectsTotal: 0,
  acidity: { frutal: 0, acetic: 0, lactic: 0, mineralButyric: 0 },
  freshFruit: { berries: 0, citrus: 0, yellowPulp: 0, dark: 0, tropical: 0 },
  brownFruit: { dry: 0, brown: 0, overripe: 0 },
  vegetal: { grassHerb: 0, earthy: 0 },
  floral: { orangeBlossom: 0, flowers: 0 },
  wood: { light: 0, dark: 0, resin: 0 },
  spice: { spices: 0, tobacco: 0, umami: 0 },
  nut: { kernel: 0, skin: 0 },
  defects: { dirty: 0, animal: 0, rotten: 0, smoke: 0, humid: 0, moldy: 0, overfermented: 0, other: 0 },
  sweetness: 0,
  textureNotes: "",
};

type NumericScoreKey = 'cacao' | 'acidityTotal' | 'freshFruitTotal' | 'brownFruitTotal' | 'vegetalTotal' | 'floralTotal' | 'woodTotal' | 'spiceTotal' | 'nutTotal' | 'caramelPanela' | 'bitterness' | 'astringency' | 'roastDegree' | 'defectsTotal';

type AttributeCategory = 'main' | 'complementary' | 'defects';

interface AttributeItem {
  key: NumericScoreKey;
  label: string;
  category: AttributeCategory;
}

const getLabelMap = (t: any): AttributeItem[] => [
  // Main attributes (key elements) - in specified order
  { key: 'cacao', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.cacao'), category: 'main' },
  { key: 'bitterness', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.bitterness'), category: 'main' },
  { key: 'astringency', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.astringency'), category: 'main' },
  { key: 'roastDegree', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.roastDegree'), category: 'main' },
  { key: 'acidityTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.acidityTotal'), category: 'main' },
  
  // Complementary attributes (may or may not be present) - in specified order
  { key: 'freshFruitTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.freshFruitTotal'), category: 'complementary' },
  { key: 'brownFruitTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.brownFruitTotal'), category: 'complementary' },
  { key: 'vegetalTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.vegetalTotal'), category: 'complementary' },
  { key: 'floralTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.floralTotal'), category: 'complementary' },
  { key: 'woodTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.woodTotal'), category: 'complementary' },
  { key: 'spiceTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.spiceTotal'), category: 'complementary' },
  { key: 'nutTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.nutTotal'), category: 'complementary' },
  { key: 'caramelPanela', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.caramelPanela'), category: 'complementary' },
  
  // Atypical flavors/defects (deviations/warnings)
  { key: 'defectsTotal', label: t('dashboard.sensoryEvaluation.intensityScale.attributes.defectsTotal'), category: 'defects' },
];

const DefectRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center space-x-4">
    <span className="w-40 text-sm">{label}</span>
    <input type="range" min={0} max={10} step={0.5} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
    <span className="w-10 text-right text-sm font-medium">{value.toFixed(1)}</span>
  </div>
);

const SliderRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center space-x-4">
    <span className="w-48 text-sm">{label}</span>
    <input type="range" min={0} max={10} step={0.1} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
    <span className="w-10 text-right text-sm font-medium">{value.toFixed(1)}</span>
  </div>
);

const getCategoryStyles = (category: AttributeCategory) => {
  switch (category) {
    case 'main':
      return {
        containerClass: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 pl-4 py-2 rounded-r',
        labelClass: 'text-blue-800 dark:text-blue-200 font-semibold',
        icon: '★',
        iconClass: 'text-blue-600'
      };
    case 'complementary':
      return {
        containerClass: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 pl-4 py-2 rounded-r',
        labelClass: 'text-green-800 dark:text-green-200',
        icon: '◆',
        iconClass: 'text-green-600'
      };
    case 'defects':
      return {
        containerClass: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 pl-4 py-2 rounded-r',
        labelClass: 'text-red-800 dark:text-red-200 font-medium',
        icon: '⚠',
        iconClass: 'text-red-600'
      };
    default:
      return {
        containerClass: '',
        labelClass: '',
        icon: '',
        iconClass: ''
      };
  }
};

const CategorizedSliderRow = ({ 
  attribute, 
  value, 
  onChange 
}: { 
  attribute: AttributeItem; 
  value: number; 
  onChange: (v: number) => void 
}) => {
  const styles = getCategoryStyles(attribute.category);
  
  return (
    <div className={`flex items-center space-x-4 ${styles.containerClass}`}>
      <div className="flex items-center space-x-2 w-48">
        <span className={`${styles.iconClass} text-sm`}>{styles.icon}</span>
        <span className={`text-sm ${styles.labelClass}`}>{attribute.label}</span>
      </div>
      <input 
        type="range" 
        min={0} 
        max={10} 
        step={0.1} 
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} 
        className="flex-1" 
      />
      <span className="w-10 text-right text-sm font-medium">{value.toFixed(1)}</span>
    </div>
  );
};

const getDisqOptions = (t: any) => [
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.humidity'),
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.mold'),
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.other'),
];

const SensoryEvaluationForm: React.FC<SensoryEvaluationFormProps> = ({ metaDefaults, initialData, referenceImageUrl, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<SensoryMeta>({
    evaluationDate: new Date().toISOString().slice(0, 10),
    evaluationTime: new Date().toISOString().slice(11, 16),
    ...metaDefaults,
    ...(initialData?.meta || {}),
  });
  const [scores, setScores] = useState<SensoryScores>(() => {
    if (!initialData?.scores) {
      return { ...defaultScores };
    }
    
    // Deep merge the nested objects
    return {
      ...defaultScores,
      ...initialData.scores,
      acidity: { ...defaultScores.acidity, ...(initialData.scores.acidity || {}) },
      freshFruit: { ...defaultScores.freshFruit, ...(initialData.scores.freshFruit || {}) },
      brownFruit: { ...defaultScores.brownFruit, ...(initialData.scores.brownFruit || {}) },
      vegetal: { ...defaultScores.vegetal, ...(initialData.scores.vegetal || {}) },
      floral: { ...defaultScores.floral, ...(initialData.scores.floral || {}) },
      wood: { ...defaultScores.wood, ...(initialData.scores.wood || {}) },
      spice: { ...defaultScores.spice, ...(initialData.scores.spice || {}) },
      nut: { ...defaultScores.nut, ...(initialData.scores.nut || {}) },
      defects: { ...defaultScores.defects, ...(initialData.scores.defects || {}) },
    };
  });

  // Auto-calc totals from sub-attributes using final weighted-sum rules (clamped to 0–10)
  const recalcTotals = (s: SensoryScores): SensoryScores => {
    const defectsSum = (
      s.defects.dirty + s.defects.animal + s.defects.rotten + s.defects.smoke +
      s.defects.humid + s.defects.moldy + s.defects.overfermented + s.defects.other
    );

    const aciditySum = (
      s.acidity.frutal + s.acidity.acetic + s.acidity.lactic + s.acidity.mineralButyric
    );

    const freshFruitWeighted = (
      s.freshFruit.berries + 0.8 * s.freshFruit.citrus + 0.3 * s.freshFruit.yellowPulp +
      0.3 * s.freshFruit.dark + 0.3 * s.freshFruit.tropical
    );

    const brownFruitWeighted = (
      s.brownFruit.dry + 0.8 * s.brownFruit.brown + 0.3 * s.brownFruit.overripe
    );

    const vegetalWeighted = (
      s.vegetal.grassHerb + 0.8 * s.vegetal.earthy
    );

    const floralWeighted = (
      s.floral.orangeBlossom + 0.8 * s.floral.flowers
    );

    const woodWeighted = (
      s.wood.light + 0.8 * s.wood.dark + 0.3 * s.wood.resin
    );

    const spiceWeighted = (
      s.spice.spices + 0.8 * s.spice.tobacco + 0.3 * s.spice.umami
    );

    const nutWeighted = (
      s.nut.kernel + 0.8 * s.nut.skin
    );

    return {
      ...s,
      acidityTotal: clamp01(aciditySum),
      freshFruitTotal: clamp01(freshFruitWeighted),
      brownFruitTotal: clamp01(brownFruitWeighted),
      vegetalTotal: clamp01(vegetalWeighted),
      floralTotal: clamp01(floralWeighted),
      woodTotal: clamp01(woodWeighted),
      spiceTotal: clamp01(spiceWeighted),
      nutTotal: clamp01(nutWeighted),
      defectsTotal: clamp01(defectsSum), // Sum of all defects, clamped to 0–10
    };
  };
  const [flavorComments, setFlavorComments] = useState(initialData?.comments?.flavorComments || "");
  const [producerRecommendations, setProducerRecommendations] = useState(initialData?.comments?.producerRecommendations || "");
  const [additionalPositive, setAdditionalPositive] = useState(initialData?.comments?.additionalPositive || "");
  const [verdict, setVerdict] = useState<SensoryVerdict>(initialData?.verdict || { result: 'Approved', reasons: [] });
  const [submitted, setSubmitted] = useState(false);

  // Derived overall quality: average of positive attributes minus mild penalty for defects
  const overallQuality = useMemo(() => {
    // Average of totals + single-value attributes; light penalty for defects
    const positives = [
      scores.cacao,
      scores.bitterness,
      scores.astringency,
      scores.caramelPanela,
      scores.acidityTotal,
      scores.freshFruitTotal,
      scores.brownFruitTotal,
      scores.vegetalTotal,
      scores.floralTotal,
      scores.woodTotal,
      scores.spiceTotal,
      scores.nutTotal,
    ];
    const base = positives.reduce((a, b) => a + b, 0) / positives.length;
    // Defects total is a SUM (not average). Normalize (divide by 8) to keep 0–10 scale impact, then apply penalty factor
    const defectsSum = (scores.defects.dirty + scores.defects.animal + scores.defects.rotten + scores.defects.smoke + scores.defects.humid + scores.defects.moldy + scores.defects.overfermented + scores.defects.other);
    const defectNormalized = defectsSum / 8; // 0–10 scale normalization
    const penalty = defectNormalized * 0.3;
    const chocolateBonus = meta.evaluationType === 'chocolate' && typeof scores.sweetness === 'number' ? (scores.sweetness - 5) * 0.05 : 0;
    return clamp01(base - penalty + chocolateBonus);
  }, [scores, meta.evaluationType]);

  const radarData = useMemo(() => {
    const labelMap = getLabelMap(t);
    return labelMap.map(({ key, label }) => ({ subject: label, value: scores[key] as number, fullMark: 10 }));
  }, [scores, t]);

  // Helper to set numeric top-level score keys safely
  const setNumeric = (k: NumericScoreKey, v: number) => {
    setScores(s => ({ ...s, [k]: clamp01(v) } as SensoryScores));
  };

  // Handler to update sub-attributes and keep totals in sync
  const updateSub = <T extends 'acidity' | 'freshFruit' | 'brownFruit' | 'vegetal' | 'floral' | 'wood' | 'spice' | 'nut'>(group: T, key: string, value: number) => {
    setScores(prev => {
      const next = { ...prev } as SensoryScores;
      (next[group] as Record<string, number>)[key] = clamp01(value);
      return recalcTotals(next);
    });
  };

  // Handler to update defects and keep totals in sync
  const updateDefect = (key: keyof SensoryScores['defects'], value: number) => {
    setScores(prev => {
      const next = { ...prev } as SensoryScores;
      next.defects[key] = clamp01(value);
      return recalcTotals(next);
    });
  };

  const handleSubmit = () => {
    const result: SensoryEvaluationResult = {
      meta,
      scores: { ...scores, overallQuality },
      comments: { flavorComments, producerRecommendations, additionalPositive },
      verdict: {
        result: verdict.result,
        reasons: verdict.reasons,
        otherReason: verdict.otherReason,
      },
    };
    setSubmitted(true);
    onSubmit?.(result);
  };

  return (
    <div className="space-y-6">
      {/* Radar Chart on top (shows live or after submit) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.flavorRadar.title')}</CardTitle>
          <CardDescription>{t('dashboard.sensoryEvaluation.flavorRadar.description', { 
            status: submitted ? t('dashboard.sensoryEvaluation.flavorRadar.status.submitted') : t('dashboard.sensoryEvaluation.flavorRadar.status.preview') 
          })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 items-center">
            {/* Left: Reference image (if provided) */}
            <div className="md:col-span-1">
              {referenceImageUrl ? (
                <img src={referenceImageUrl} alt="Flavor reference" className="rounded border w-full" />
              ) : (
                <div className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.flavorRadar.referenceImage')}</div>
              )}
            </div>
            {/* Right: Live radar chart */}
            <div className="md:col-span-2" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius={110}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Radar name="Intensity" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                  <ReTooltip formatter={(value: number | string) => Number(value).toFixed(1)} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-muted-foreground">
                {t('dashboard.sensoryEvaluation.flavorRadar.overallQuality')} <span className="font-semibold">{overallQuality.toFixed(1)}/10</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.metaInformation.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.metaInformation.fields.date')}</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={meta.evaluationDate || ''} onChange={e => setMeta({ ...meta, evaluationDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.metaInformation.fields.time')}</label>
              <input type="time" className="w-full border rounded px-3 py-2" value={meta.evaluationTime || ''} onChange={e => setMeta({ ...meta, evaluationTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.metaInformation.fields.evaluatorName')}</label>
            <input className="w-full border rounded px-3 py-2" value={meta.evaluatorName || ''} onChange={e => setMeta({ ...meta, evaluatorName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.metaInformation.fields.sampleCode')}</label>
            <input className="w-full border rounded px-3 py-2" value={meta.sampleCode || ''} onChange={e => setMeta({ ...meta, sampleCode: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.metaInformation.fields.sampleNotes')}</label>
            <textarea className="w-full border rounded px-3 py-2" rows={2} value={meta.sampleNotes || ''} onChange={e => setMeta({ ...meta, sampleNotes: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Type + Main Attributes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{t('dashboard.sensoryEvaluation.intensityScale.title')}</CardTitle>
              <CardDescription>{t('dashboard.sensoryEvaluation.intensityScale.description')}</CardDescription>
            </div>
            <div className="min-w-[220px]">
              <label className="block text-xs text-muted-foreground mb-1">{t('dashboard.sensoryEvaluation.intensityScale.evaluationType')}</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={meta.evaluationType || 'cocoa_mass'}
                onChange={(e) => setMeta({ ...meta, evaluationType: e.target.value as 'cocoa_mass' | 'chocolate' })}
              >
                <option value="cocoa_mass">{t('dashboard.sensoryEvaluation.intensityScale.types.cocoaMass')}</option>
                <option value="chocolate">{t('dashboard.sensoryEvaluation.intensityScale.types.chocolate')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Categorized attributes with visual differentiation */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">★</span>
                  <span>{t('dashboard.sensoryEvaluation.intensityScale.categories.main')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">◆</span>
                  <span>{t('dashboard.sensoryEvaluation.intensityScale.categories.complementary')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>{t('dashboard.sensoryEvaluation.intensityScale.categories.defects')}</span>
                </div>
              </div>
            </div>
            {getLabelMap(t).map((attribute) => (
              <CategorizedSliderRow 
                key={attribute.key} 
                attribute={attribute} 
                value={scores[attribute.key] as number} 
                onChange={(v) => setNumeric(attribute.key, v)} 
              />
            ))}
          </div>

          <Separator className="my-2" />

          {/* Sub-attributes that feed the totals (exact per your schema) */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.fruity')} value={scores.acidity.frutal} onChange={(v) => updateSub('acidity', 'frutal', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acetic')} value={scores.acidity.acetic} onChange={(v) => updateSub('acidity', 'acetic', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.lactic')} value={scores.acidity.lactic} onChange={(v) => updateSub('acidity', 'lactic', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.mineralButyric')} value={scores.acidity.mineralButyric} onChange={(v) => updateSub('acidity', 'mineralButyric', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.berries')} value={scores.freshFruit.berries} onChange={(v) => updateSub('freshFruit', 'berries', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.citrus')} value={scores.freshFruit.citrus} onChange={(v) => updateSub('freshFruit', 'citrus', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.yellowPulp')} value={scores.freshFruit.yellowPulp} onChange={(v) => updateSub('freshFruit', 'yellowPulp', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.dark')} value={scores.freshFruit.dark} onChange={(v) => updateSub('freshFruit', 'dark', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.tropical')} value={scores.freshFruit.tropical} onChange={(v) => updateSub('freshFruit', 'tropical', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brownFruit')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.dry')} value={scores.brownFruit.dry} onChange={(v) => updateSub('brownFruit', 'dry', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brown')} value={scores.brownFruit.brown} onChange={(v) => updateSub('brownFruit', 'brown', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.overripe')} value={scores.brownFruit.overripe} onChange={(v) => updateSub('brownFruit', 'overripe', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.vegetal')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.grassHerb')} value={scores.vegetal.grassHerb} onChange={(v) => updateSub('vegetal', 'grassHerb', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.earthy')} value={scores.vegetal.earthy} onChange={(v) => updateSub('vegetal', 'earthy', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.floral')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.orangeBlossom')} value={scores.floral.orangeBlossom} onChange={(v) => updateSub('floral', 'orangeBlossom', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.flowers')} value={scores.floral.flowers} onChange={(v) => updateSub('floral', 'flowers', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.wood')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.light')} value={scores.wood.light} onChange={(v) => updateSub('wood', 'light', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.woodDark')} value={scores.wood.dark} onChange={(v) => updateSub('wood', 'dark', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.resin')} value={scores.wood.resin} onChange={(v) => updateSub('wood', 'resin', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spice')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spices')} value={scores.spice.spices} onChange={(v) => updateSub('spice', 'spices', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.tobacco')} value={scores.spice.tobacco} onChange={(v) => updateSub('spice', 'tobacco', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.umami')} value={scores.spice.umami} onChange={(v) => updateSub('spice', 'umami', v)} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.nut')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.kernel')} value={scores.nut.kernel} onChange={(v) => updateSub('nut', 'kernel', v)} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.skin')} value={scores.nut.skin} onChange={(v) => updateSub('nut', 'skin', v)} />
            </div>
          </div>

          {/* Sweetness only for chocolate */}
          {meta.evaluationType === 'chocolate' && (
            <div>
              <Separator className="my-4" />
              <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.intensityScale.directAttributes.sweetnessNote')}</label>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.directAttributes.sweetness')} value={scores.sweetness ?? 0} onChange={(v) => setScores(s => ({ ...s, sweetness: clamp01(v) }))} />
            </div>
          )}

          {/* Texture note always available */}
          <div className="grid md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.intensityScale.directAttributes.textureNotes')}</label>
              <input className="w-full border rounded px-3 py-2" value={scores.textureNotes || ''} onChange={(e) => setScores(s => ({ ...s, textureNotes: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defects / Off-Flavors */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.defects.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.dirty')} value={scores.defects.dirty} onChange={(v) => updateDefect('dirty', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.animal')} value={scores.defects.animal} onChange={(v) => updateDefect('animal', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.rotten')} value={scores.defects.rotten} onChange={(v) => updateDefect('rotten', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.smoke')} value={scores.defects.smoke} onChange={(v) => updateDefect('smoke', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.humid')} value={scores.defects.humid} onChange={(v) => updateDefect('humid', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.moldy')} value={scores.defects.moldy} onChange={(v) => updateDefect('moldy', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.overfermented')} value={scores.defects.overfermented} onChange={(v) => updateDefect('overfermented', v)} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.other')} value={scores.defects.other} onChange={(v) => updateDefect('other', v)} />
          <div className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.defects.note')}</div>
        </CardContent>
      </Card>

      {/* Free Text */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.freeText.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.freeText.fields.flavorComments')}</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={flavorComments} onChange={(e) => setFlavorComments(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.freeText.fields.producerRecommendations')}</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={producerRecommendations} onChange={(e) => setProducerRecommendations(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.freeText.fields.additionalPositive')}</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={additionalPositive} onChange={(e) => setAdditionalPositive(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Final Verdict */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.finalVerdict.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button variant={verdict.result === 'Approved' ? 'default' : 'outline'} onClick={() => setVerdict(v => ({ ...v, result: 'Approved' }))}>{t('dashboard.sensoryEvaluation.finalVerdict.buttons.approved')}</Button>
            <Button variant={verdict.result === 'Disqualified' ? 'default' : 'outline'} onClick={() => setVerdict(v => ({ ...v, result: 'Disqualified' }))}>{t('dashboard.sensoryEvaluation.finalVerdict.buttons.disqualified')}</Button>
            <Badge variant="secondary">{t('dashboard.sensoryEvaluation.finalVerdict.overall')} {overallQuality.toFixed(1)}/10</Badge>
          </div>
          {verdict.result === 'Disqualified' && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{t('dashboard.sensoryEvaluation.finalVerdict.disqualificationReasons')}</div>
              <div className="grid md:grid-cols-3 gap-3">
                {getDisqOptions(t).map(opt => (
                  <label key={opt} className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={verdict.reasons?.includes(opt)} onChange={(e) => {
                      const checked = e.target.checked;
                      setVerdict(v => {
                        const set = new Set(v.reasons || []);
                        if (checked) set.add(opt); else set.delete(opt);
                        return { ...v, reasons: Array.from(set) };
                      });
                    }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {verdict.reasons?.includes(t('dashboard.sensoryEvaluation.finalVerdict.reasons.other')) && (
                <input className="w-full border rounded px-3 py-2" placeholder={t('dashboard.sensoryEvaluation.finalVerdict.otherReasonPlaceholder')} value={verdict.otherReason || ''} onChange={(e) => setVerdict(v => ({ ...v, otherReason: e.target.value }))} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>{t('dashboard.sensoryEvaluation.actions.cancel')}</Button>
        )}
        <Button onClick={handleSubmit}>{t('dashboard.sensoryEvaluation.actions.completeEvaluation')}</Button>
      </div>
    </div>
  );
};

export default SensoryEvaluationForm;