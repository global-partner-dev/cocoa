import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { calculateChocolateOverallScore, getChocolateScoringBreakdown } from "@/lib/chocolateScoringUtils";
import { HelpCircle } from "lucide-react";

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
  // Single-value attributes (0-10) - for cocoa bean/liquor
  cacao: number; // Cacao
  bitterness: number; // Bitterness
  astringency: number; // Astringency
  caramelPanela: number; // Caramel / Panela (simple value)

  // Calculated group totals (0-10) - for cocoa bean/liquor
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

  // Sub-attributes used to compute totals (0-10) - for cocoa bean/liquor
  acidity: { frutal: number; acetic: number; lactic: number; mineralButyric: number };
  freshFruit: { berries: number; citrus: number; yellowPulp: number; dark: number; tropical: number };
  brownFruit: { dry: number; brown: number; overripe: number };
  vegetal: { grassHerb: number; earthy: number };
  floral: { orangeBlossom: number; flowers: number };
  wood: { light: number; dark: number; resin: number };
  spice: { spices: number; tobacco: number; umami: number };
  nut: { kernel: number; skin: number };

  // Defects (0-10) - for cocoa bean/liquor
  defects: {
    dirty: number; animal: number; rotten: number; smoke: number; humid: number; moldy: number; overfermented: number; other: number;
  };
  
  // Typical and Atypical Odors (cocoa_liquor only)
  typicalOdors?: {
    cleanCacao: boolean;
    chocolate: boolean;
    ripeFruit: boolean;
    floral: boolean;
    spicy: boolean;
    caramelSweet: boolean;
    honeyMolasses: boolean;
    driedFruits: boolean;
    citrus: boolean;
    freshHerbal: boolean;
    butterySoftDairy: boolean;
    lightSmoky: boolean;
  };
  atypicalOdors?: {
    excessFermentation: boolean;
    moldDamp: boolean;
    earthClay: boolean;
    intenseSmokeOrBurnt: boolean;
    rancidOxidized: boolean;
    medicinalChemical: boolean;
    animalLeather: boolean;
    soapDetergent: boolean;
    pronouncedTannicNote: boolean;
    sulfurousRottenEgg: boolean;
    fuelGasolineDiesel: boolean;
    industrialSolvents: boolean;
  };
  
  // Chocolate-specific evaluation attributes
  chocolate?: {
    // 1 Appearance
    appearance: {
      color: number; // 0-10
      gloss: number; // 0-10
      surfaceHomogeneity: number; // 0-10
    };
    // 2 Aroma
    aroma: {
      aromaIntensity: number; // 0-10
      aromaQuality: number; // 0-10
      specificNotes: {
        floral: number; // 0-10
        fruity: number; // 0-10
        toasted: number; // 0-10
        hazelnut: number; // 0-10
        earthy: number; // 0-10
        spicy: number; // 0-10
        milky: number; // 0-10
        woody: number; // 0-10
      };
    };
    // 3 Texture
    texture: {
      smoothness: number; // 0-10
      melting: number; // 0-10
      body: number; // 0-10
    };
    // 4 Flavor
    flavor: {
      sweetness: number; // 0-10
      bitterness: number; // 0-10
      acidity: number; // 0-10
      flavorIntensity: number; // 0-10
      flavorNotes: {
        citrus: number; // 0-10
        redFruits: number; // 0-10
        nuts: number; // 0-10
        caramel: number; // 0-10
        malt: number; // 0-10
        wood: number; // 0-10
        spices: number; // 0-10
      };
    };
    // 5 Aftertaste
    aftertaste: {
      persistence: number; // 0-10
      aftertasteQuality: number; // 0-10
      finalBalance: number; // 0-10
    };
  };
  
  // Legacy chocolate attributes (for backward compatibility)
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
  category?: 'cocoa_bean' | 'cocoa_liquor' | 'chocolate'; // Sample category from database
  onCancel?: () => void;
  onSubmit?: (result: SensoryEvaluationResult) => void;
}

// Utility to clamp and format numbers
const clamp01 = (v: number) => Math.max(0, Math.min(10, v));

const defaultScores: SensoryScores = {
  cacao: 0, bitterness: 0, astringency: 0, caramelPanela: 0,
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
  typicalOdors: {
    cleanCacao: false, chocolate: false, ripeFruit: false, floral: false, spicy: false, caramelSweet: false,
    honeyMolasses: false, driedFruits: false, citrus: false, freshHerbal: false, butterySoftDairy: false, lightSmoky: false
  },
  atypicalOdors: {
    excessFermentation: false, moldDamp: false, earthClay: false, intenseSmokeOrBurnt: false, rancidOxidized: false, medicinalChemical: false,
    animalLeather: false, soapDetergent: false, pronouncedTannicNote: false, sulfurousRottenEgg: false, fuelGasolineDiesel: false, industrialSolvents: false
  },
  chocolate: {
    appearance: {
      color: 0,
      gloss: 0,
      surfaceHomogeneity: 0,
    },
    aroma: {
      aromaIntensity: 0,
      aromaQuality: 0,
      specificNotes: {
        floral: 0,
        fruity: 0,
        toasted: 0,
        hazelnut: 0,
        earthy: 0,
        spicy: 0,
        milky: 0,
        woody: 0,
      },
    },
    texture: {
      smoothness: 0,
      melting: 0,
      body: 0,
    },
    flavor: {
      sweetness: 0,
      bitterness: 0,
      acidity: 0,
      flavorIntensity: 0,
      flavorNotes: {
        citrus: 0,
        redFruits: 0,
        nuts: 0,
        caramel: 0,
        malt: 0,
        wood: 0,
        spices: 0,
      },
    },
    aftertaste: {
      persistence: 0,
      aftertasteQuality: 0,
      finalBalance: 0,
    },
  },
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

// Tooltip descriptions for main attributes
const getAttributeTooltips = (t: any): Record<string, string> => ({
  cacao: t('dashboard.sensoryEvaluation.tooltips.cacao'),
  bitterness: t('dashboard.sensoryEvaluation.tooltips.bitterness'),
  astringency: t('dashboard.sensoryEvaluation.tooltips.astringency'),
  roastDegree: t('dashboard.sensoryEvaluation.tooltips.roastDegree'),
  acidityTotal: t('dashboard.sensoryEvaluation.tooltips.acidityTotal'),
  freshFruitTotal: t('dashboard.sensoryEvaluation.tooltips.freshFruitTotal'),
  brownFruitTotal: t('dashboard.sensoryEvaluation.tooltips.brownFruitTotal'),
  vegetalTotal: t('dashboard.sensoryEvaluation.tooltips.vegetalTotal'),
  floralTotal: t('dashboard.sensoryEvaluation.tooltips.floralTotal'),
  woodTotal: t('dashboard.sensoryEvaluation.tooltips.woodTotal'),
  spiceTotal: t('dashboard.sensoryEvaluation.tooltips.spiceTotal'),
  nutTotal: t('dashboard.sensoryEvaluation.tooltips.nutTotal'),
  caramelPanela: t('dashboard.sensoryEvaluation.tooltips.caramelPanela'),
  defectsTotal: t('dashboard.sensoryEvaluation.tooltips.defectsTotal'),
});

// Tooltip descriptions for sub-attributes
const getSubAttributeTooltips = (t: any): Record<string, string> => ({
  // Acidity sub-attributes
  frutal: t('dashboard.sensoryEvaluation.tooltips.subAttributes.frutal'),
  acetic: t('dashboard.sensoryEvaluation.tooltips.subAttributes.acetic'),
  lactic: t('dashboard.sensoryEvaluation.tooltips.subAttributes.lactic'),
  mineralButyric: t('dashboard.sensoryEvaluation.tooltips.subAttributes.mineralButyric'),
  
  // Fresh Fruit sub-attributes
  berries: t('dashboard.sensoryEvaluation.tooltips.subAttributes.berries'),
  citrus: t('dashboard.sensoryEvaluation.tooltips.subAttributes.citrus'),
  darkFruit: t('dashboard.sensoryEvaluation.tooltips.subAttributes.dark'),
  yellowPulp: t('dashboard.sensoryEvaluation.tooltips.subAttributes.yellowPulp'),
  tropical: t('dashboard.sensoryEvaluation.tooltips.subAttributes.tropical'),
  
  // Brown Fruit sub-attributes
  dry: t('dashboard.sensoryEvaluation.tooltips.subAttributes.dry'),
  brown: t('dashboard.sensoryEvaluation.tooltips.subAttributes.brown'),
  overripe: t('dashboard.sensoryEvaluation.tooltips.subAttributes.overripe'),
  
  // Vegetal sub-attributes
  grassHerb: t('dashboard.sensoryEvaluation.tooltips.subAttributes.grassHerb'),
  earthy: t('dashboard.sensoryEvaluation.tooltips.subAttributes.earthy'),
  mushroom: t('dashboard.sensoryEvaluation.tooltips.subAttributes.mushroom'),
  mossForest: t('dashboard.sensoryEvaluation.tooltips.subAttributes.mossForest'),
  
  // Floral sub-attributes
  orangeBlossom: t('dashboard.sensoryEvaluation.tooltips.subAttributes.orangeBlossom'),
  flowers: t('dashboard.sensoryEvaluation.tooltips.subAttributes.flowers'),
  
  // Wood sub-attributes
  lightWood: t('dashboard.sensoryEvaluation.tooltips.subAttributes.light'),
  darkWood: t('dashboard.sensoryEvaluation.tooltips.subAttributes.woodDark'),
  resin: t('dashboard.sensoryEvaluation.tooltips.subAttributes.resin'),
  
  // Spice sub-attributes
  spices: t('dashboard.sensoryEvaluation.tooltips.subAttributes.spices'),
  tobacco: t('dashboard.sensoryEvaluation.tooltips.subAttributes.tobacco'),
  umami: t('dashboard.sensoryEvaluation.tooltips.subAttributes.umami'),
  
  // Nut sub-attributes
  kernel: t('dashboard.sensoryEvaluation.tooltips.subAttributes.kernel'),
  skin: t('dashboard.sensoryEvaluation.tooltips.subAttributes.skin'),
  
  // Defects
  dirty: t('dashboard.sensoryEvaluation.tooltips.subAttributes.dirty'),
  animal: t('dashboard.sensoryEvaluation.tooltips.subAttributes.animal'),
  overfermented: t('dashboard.sensoryEvaluation.tooltips.subAttributes.overfermented'),
  rotten: t('dashboard.sensoryEvaluation.tooltips.subAttributes.rotten'),
  smoke: t('dashboard.sensoryEvaluation.tooltips.subAttributes.smoke'),
  humid: t('dashboard.sensoryEvaluation.tooltips.subAttributes.humid'),
  moldy: t('dashboard.sensoryEvaluation.tooltips.subAttributes.moldy'),
  other: t('dashboard.sensoryEvaluation.tooltips.subAttributes.other'),
});

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

const DefectRow = ({ label, value, onChange, tooltip }: { label: string; value: number; onChange: (v: number) => void; tooltip?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
    <div className="sm:w-40 text-sm flex items-center gap-1 min-w-0">
      <span className="truncate">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            <p className="text-sm leading-relaxed">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="flex items-center space-x-3 flex-1">
      <input type="range" min={0} max={10} step={0.5} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 min-w-0" />
      <span className="w-10 text-right text-sm font-medium flex-shrink-0">{value.toFixed(1)}</span>
    </div>
  </div>
);

const SliderRow = ({ label, value, onChange, tooltip }: { label: string; value: number; onChange: (v: number) => void; tooltip?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
    <div className="sm:w-48 text-sm flex items-center gap-1 min-w-0">
      <span className="truncate">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm">
            <p className="text-sm leading-relaxed">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="flex items-center space-x-3 flex-1">
      <input type="range" min={0} max={10} step={0.1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 min-w-0" />
      <span className="w-10 text-right text-sm font-medium flex-shrink-0">{value.toFixed(1)}</span>
    </div>
  </div>
);

const CheckboxRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <div className="flex items-center space-x-3">
    <Checkbox checked={checked} onCheckedChange={(checked) => onChange(Boolean(checked))} className="flex-shrink-0" />
    <span className="flex-1 text-sm break-words">{label}</span>
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
  onChange,
  tooltip
}: { 
  attribute: AttributeItem; 
  value: number; 
  onChange: (v: number) => void;
  tooltip?: string;
}) => {
  const styles = getCategoryStyles(attribute.category);
  
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 ${styles.containerClass}`}>
      <div className="flex items-center space-x-2 sm:w-48 min-w-0">
        <span className={`${styles.iconClass} text-sm flex-shrink-0`}>{styles.icon}</span>
        <span className={`text-sm ${styles.labelClass} truncate`}>{attribute.label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <p className="text-sm leading-relaxed">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center space-x-3 flex-1">
        <input 
          type="range" 
          min={0} 
          max={10} 
          step={0.1} 
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} 
          className="flex-1 min-w-0" 
        />
        <span className="w-10 text-right text-sm font-medium flex-shrink-0">{value.toFixed(1)}</span>
      </div>
    </div>
  );
};

const getDisqOptions = (t: any) => [
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.humidity'),
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.mold'),
  t('dashboard.sensoryEvaluation.finalVerdict.reasons.other'),
];

const SensoryEvaluationForm: React.FC<SensoryEvaluationFormProps> = ({ metaDefaults, initialData, referenceImageUrl, category, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<'cocoa_bean' | 'cocoa_liquor' | 'chocolate'>(category || 'cocoa_bean');
  const [meta, setMeta] = useState<SensoryMeta>({
    evaluationDate: new Date().toISOString().slice(0, 10),
    evaluationTime: new Date().toISOString().slice(11, 16),
    ...metaDefaults,
    ...(initialData?.meta || {}),
    // Set evaluationType based on selectedCategory, mapping cocoa_liquor to cocoa_mass for backward compatibility
    evaluationType: selectedCategory === 'cocoa_liquor' ? 'cocoa_mass' : (selectedCategory === 'chocolate' ? 'chocolate' : 'cocoa_mass'),
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
      typicalOdors: { ...defaultScores.typicalOdors, ...(initialData.scores.typicalOdors || {}) },
      atypicalOdors: { ...defaultScores.atypicalOdors, ...(initialData.scores.atypicalOdors || {}) },
      chocolate: initialData.scores.chocolate ? {
        appearance: { ...defaultScores.chocolate!.appearance, ...(initialData.scores.chocolate.appearance || {}) },
        aroma: {
          ...defaultScores.chocolate!.aroma,
          ...(initialData.scores.chocolate.aroma || {}),
          specificNotes: { ...defaultScores.chocolate!.aroma.specificNotes, ...(initialData.scores.chocolate.aroma?.specificNotes || {}) }
        },
        texture: { ...defaultScores.chocolate!.texture, ...(initialData.scores.chocolate.texture || {}) },
        flavor: {
          ...defaultScores.chocolate!.flavor,
          ...(initialData.scores.chocolate.flavor || {}),
          flavorNotes: { ...defaultScores.chocolate!.flavor.flavorNotes, ...(initialData.scores.chocolate.flavor?.flavorNotes || {}) }
        },
        aftertaste: { ...defaultScores.chocolate!.aftertaste, ...(initialData.scores.chocolate.aftertaste || {}) },
      } : defaultScores.chocolate,
    };
  });

  // Auto-calc totals from sub-attributes using NEW weighted-sum rules (clamped to 0–10)
  const recalcTotals = (s: SensoryScores): SensoryScores => {
    const defectsSum = (
      s.defects.dirty + s.defects.animal + s.defects.rotten + s.defects.smoke +
      s.defects.humid + s.defects.moldy + s.defects.overfermented + s.defects.other
    );

    // NEW SCORING: Complementary attributes use SUM (not weighted average), capped at 10
    const aciditySum = (
      s.acidity.frutal + s.acidity.acetic + s.acidity.lactic + s.acidity.mineralButyric
    );

    const freshFruitSum = (
      s.freshFruit.berries + s.freshFruit.citrus + s.freshFruit.yellowPulp +
      s.freshFruit.dark + s.freshFruit.tropical
    );

    const brownFruitSum = (
      s.brownFruit.dry + s.brownFruit.brown + s.brownFruit.overripe
    );

    const vegetalSum = (
      s.vegetal.grassHerb + s.vegetal.earthy
    );

    const floralSum = (
      s.floral.orangeBlossom + s.floral.flowers
    );

    const woodSum = (
      s.wood.light + s.wood.dark + s.wood.resin
    );

    const spiceSum = (
      s.spice.spices + s.spice.tobacco + s.spice.umami
    );

    const nutSum = (
      s.nut.kernel + s.nut.skin
    );

    return {
      ...s,
      acidityTotal: clamp01(aciditySum),
      freshFruitTotal: clamp01(freshFruitSum),
      brownFruitTotal: clamp01(brownFruitSum),
      vegetalTotal: clamp01(vegetalSum),
      floralTotal: clamp01(floralSum),
      woodTotal: clamp01(woodSum),
      spiceTotal: clamp01(spiceSum),
      nutTotal: clamp01(nutSum),
      defectsTotal: clamp01(defectsSum), // Sum of all defects, clamped to 0–10
    };
  };
  const [flavorComments, setFlavorComments] = useState(initialData?.comments?.flavorComments || "");
  const [producerRecommendations, setProducerRecommendations] = useState(initialData?.comments?.producerRecommendations || "");
  const [additionalPositive, setAdditionalPositive] = useState(initialData?.comments?.additionalPositive || "");
  const [verdict, setVerdict] = useState<SensoryVerdict>(initialData?.verdict || { result: 'Approved', reasons: [] });
  const [submitted, setSubmitted] = useState(false);
  const [showDefectConfirmation, setShowDefectConfirmation] = useState(false);

  // Initialize chocolate structure when chocolate category is selected
  useEffect(() => {
    if (selectedCategory === 'chocolate' && !scores.chocolate) {
      setScores(prev => ({
        ...prev,
        chocolate: { ...defaultScores.chocolate! }
      }));
    }
  }, [selectedCategory, scores.chocolate]);

  // NEW SCORING SYSTEM: Weighted scoring with defect penalties
  const overallQuality = useMemo(() => {
    if (selectedCategory === 'chocolate' && scores.chocolate) {
      // NEW CHOCOLATE SCORING METHOD (Weighted by Category)
      // Uses the standardized chocolate scoring utility
      // Formula: (Flavor × 0.40) + (Aroma × 0.25) + (Texture × 0.20) + (Aftertaste × 0.10) + (Appearance × 0.05)
      return calculateChocolateOverallScore(scores.chocolate);
    } else {
      // NEW SCORING FORMULA for cocoa bean/liquor:
      // TOTAL_SCORE = (MAIN_ATTRIBUTES_SCORE × 0.60) + (COMPLEMENTARY_ATTRIBUTES_SCORE × 0.40) − DEFECT_PENALTY
      
      // 1. Main Attributes (60% of Total)
      // Cocoa (40%), Bitterness (25%), Astringency (20%), Roasting Degree (15%)
      const mainScore = (
        scores.cacao * 0.40 +
        scores.bitterness * 0.25 +
        scores.astringency * 0.20 +
        scores.roastDegree * 0.15
      ); 
      
      // 2. Complementary Attributes (40% of Total)
      // Average of 9 complementary attributes, then multiply by 4
      const complementaryAttributes = [
        scores.acidityTotal,
        scores.freshFruitTotal,
        scores.brownFruitTotal,
        scores.vegetalTotal,
        scores.floralTotal,
        scores.woodTotal,
        scores.spiceTotal,
        scores.nutTotal,
        scores.caramelPanela,
      ];
      const complementaryScore = (complementaryAttributes.reduce((a, b) => a + b, 0) / 9);
      
      // 3. Defect Penalty System
      const defectsTotal = scores.defectsTotal;
      let defectPenalty = 0;
      
      if (defectsTotal >= 7) {
        // Automatic disqualification
        return 0;
      } else if (defectsTotal >= 3 && defectsTotal < 7) {
        // Proportional penalty: PENALTY = (TOTAL_DEFECT / 10) × NO_DEFECT_SCORE
        const noDefectScore = mainScore + complementaryScore;
        defectPenalty = (defectsTotal / 10) * noDefectScore;
      }
      // If defectsTotal < 3, no penalty
      
      const totalScore = mainScore + complementaryScore - defectPenalty;
      return clamp01(totalScore);
    }
  }, [scores, selectedCategory]);

  const radarData = useMemo(() => {
    if (selectedCategory === 'chocolate' && scores.chocolate) {
      // For chocolate evaluation, show chocolate-specific attributes
      return [
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.color'), value: scores.chocolate.appearance.color, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.gloss'), value: scores.chocolate.appearance.gloss, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.surface'), value: scores.chocolate.appearance.surfaceHomogeneity, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.aromaIntensity'), value: scores.chocolate.aroma.aromaIntensity, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.aromaQuality'), value: scores.chocolate.aroma.aromaQuality, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.smoothness'), value: scores.chocolate.texture.smoothness, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.melting'), value: scores.chocolate.texture.melting, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.body'), value: scores.chocolate.texture.body, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.sweetness'), value: scores.chocolate.flavor.sweetness, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.bitterness'), value: scores.chocolate.flavor.bitterness, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.acidity'), value: scores.chocolate.flavor.acidity, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.flavorIntensity'), value: scores.chocolate.flavor.flavorIntensity, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.persistence'), value: scores.chocolate.aftertaste.persistence, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.aftertasteQuality'), value: scores.chocolate.aftertaste.aftertasteQuality, fullMark: 10 },
        { subject: t('dashboard.sensoryEvaluation.chocolateRadar.finalBalance'), value: scores.chocolate.aftertaste.finalBalance, fullMark: 10 },
      ];
    } else {
      // For cocoa bean/liquor evaluation, use original attributes
      const labelMap = getLabelMap(t);
      return labelMap.map(({ key, label }) => ({ subject: label, value: scores[key] as number, fullMark: 10 }));
    }
  }, [scores, t, selectedCategory]);

  // Helper to set numeric top-level score keys safely
  const setNumeric = (k: NumericScoreKey, v: number) => {
    setScores(s => ({ ...s, [k]: clamp01(v) } as SensoryScores));
  };

  // Handler to update sub-attributes and keep totals in sync
  const updateSub = <T extends 'acidity' | 'freshFruit' | 'brownFruit' | 'vegetal' | 'floral' | 'wood' | 'spice' | 'nut'>(group: T, key: string, value: number) => {
    setScores(prev => {
      const next = { ...prev } as SensoryScores;
      if (!next[group]) {
        next[group] = {} as any;
      }
      (next[group] as Record<string, number>)[key] = clamp01(value);
      return recalcTotals(next);
    });
  };

  // Handler to update boolean odor attributes
  const updateOdor = <T extends 'typicalOdors' | 'atypicalOdors'>(group: T, key: string, value: boolean) => {
    setScores(prev => {
      const next = { ...prev } as SensoryScores;
      if (!next[group]) {
        next[group] = {} as any;
      }
      (next[group] as Record<string, boolean>)[key] = value;
      return next;
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

  // Handler to update chocolate attributes
  const updateChocolateAttribute = (section: keyof NonNullable<SensoryScores['chocolate']>, key: string, value: number) => {
    setScores(prev => {
      const next = { ...prev } as SensoryScores;
      if (!next.chocolate) {
        next.chocolate = { ...defaultScores.chocolate! };
      }
      
      const sectionData = next.chocolate[section] as any;
      if (typeof sectionData === 'object' && sectionData !== null) {
        if (key.includes('.')) {
          // Handle nested attributes like specificNotes.floral
          const [subSection, subKey] = key.split('.');
          if (!sectionData[subSection]) {
            sectionData[subSection] = {};
          }
          sectionData[subSection][subKey] = clamp01(value);
        } else {
          sectionData[key] = clamp01(value);
        }
      }
      
      return next;
    });
  };

  const handleSubmit = () => {
    // Check if defects >= 3 for cocoa bean/liquor and show confirmation
    if (selectedCategory !== 'chocolate' && scores.defectsTotal >= 3 && !showDefectConfirmation) {
      setShowDefectConfirmation(true);
      return;
    }
    
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
    setShowDefectConfirmation(false);
    onSubmit?.(result);
  };

  // Get tooltip maps
  const attributeTooltips = getAttributeTooltips(t);
  const subAttributeTooltips = getSubAttributeTooltips(t);

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Radar Chart on top (shows live or after submit) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.flavorRadar.title')}</CardTitle>
          <CardDescription>{t('dashboard.sensoryEvaluation.flavorRadar.description', { 
            status: submitted ? t('dashboard.sensoryEvaluation.flavorRadar.status.submitted') : t('dashboard.sensoryEvaluation.flavorRadar.status.preview') 
          })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Left: Reference image (if provided) */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              {referenceImageUrl ? (
                <img src={referenceImageUrl} alt="Flavor reference" className="rounded border w-full max-w-sm mx-auto lg:max-w-none" />
              ) : (
                <div className="text-xs text-muted-foreground text-center lg:text-left">{t('dashboard.sensoryEvaluation.flavorRadar.referenceImage')}</div>
              )}
            </div>
            {/* Right: Live radar chart */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="w-full" style={{ height: 'clamp(280px, 50vw, 400px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="80%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 'clamp(8px, 2vw, 10px)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 'clamp(8px, 2vw, 10px)' }} />
                    <Radar name="Intensity" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                    <ReTooltip formatter={(value: number | string) => Number(value).toFixed(1)} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-sm text-muted-foreground text-center lg:text-left">
                {t('dashboard.sensoryEvaluation.flavorRadar.overallQuality')} <span className="font-semibold">{overallQuality.toFixed(1)}/10</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown Panel - Only for cocoa bean/liquor */}
      {selectedCategory !== 'chocolate' && (
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Score Breakdown</span>
            </CardTitle>
            <CardDescription>Detailed calculation of the final score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Attributes Score */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-blue-800 dark:text-blue-200">Main Attributes (60%)</span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {((scores.cacao * 0.40 + scores.bitterness * 0.25 + scores.astringency * 0.20 + scores.roastDegree * 0.15)).toFixed(2)}/10
                </span>
              </div>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <div className="flex justify-between">
                  <span>• Cocoa (40%): {scores.cacao.toFixed(1)}</span>
                  <span>{(scores.cacao * 0.40 ).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Bitterness (25%): {scores.bitterness.toFixed(1)}</span>
                  <span>{(scores.bitterness * 0.25 ).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Astringency (20%): {scores.astringency.toFixed(1)}</span>
                  <span>{(scores.astringency * 0.20 ).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Roasting Degree (15%): {scores.roastDegree.toFixed(1)}</span>
                  <span>{(scores.roastDegree * 0.15 ).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Complementary Attributes Score */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-green-800 dark:text-green-200">Complementary Attributes (40%)</span>
                <span className="text-lg font-bold text-green-900 dark:text-green-100">
                  {(([scores.acidityTotal, scores.freshFruitTotal, scores.brownFruitTotal, scores.vegetalTotal, scores.floralTotal, scores.woodTotal, scores.spiceTotal, scores.nutTotal, scores.caramelPanela].reduce((a, b) => a + b, 0) / 9)).toFixed(2)}/10
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-green-700 dark:text-green-300">
                <div>• Acidity: {scores.acidityTotal.toFixed(1)}</div>
                <div>• Fresh Fruit: {scores.freshFruitTotal.toFixed(1)}</div>
                <div>• Brown Fruit: {scores.brownFruitTotal.toFixed(1)}</div>
                <div>• Vegetal: {scores.vegetalTotal.toFixed(1)}</div>
                <div>• Floral: {scores.floralTotal.toFixed(1)}</div>
                <div>• Wood: {scores.woodTotal.toFixed(1)}</div>
                <div>• Spice: {scores.spiceTotal.toFixed(1)}</div>
                <div>• Nut: {scores.nutTotal.toFixed(1)}</div>
                <div>• Caramel/Panela: {scores.caramelPanela.toFixed(1)}</div>
              </div>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                {t('dashboard.sensoryEvaluation.scoring.average', { value: ([scores.acidityTotal, scores.freshFruitTotal, scores.brownFruitTotal, scores.vegetalTotal, scores.floralTotal, scores.woodTotal, scores.spiceTotal, scores.nutTotal, scores.caramelPanela].reduce((a, b) => a + b, 0) / 9).toFixed(2) })}
              </div>
            </div>

            {/* Defect Penalty */}
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-red-800 dark:text-red-200">{t('dashboard.sensoryEvaluation.scoring.defectPenalty')}</span>
                <span className="text-lg font-bold text-red-900 dark:text-red-100">
                  {scores.defectsTotal >= 7 ? t('dashboard.sensoryEvaluation.scoring.disqualified') : 
                   scores.defectsTotal >= 3 ? `-${((scores.defectsTotal / 10) * ((scores.cacao * 0.40 + scores.bitterness * 0.25 + scores.astringency * 0.20 + scores.roastDegree * 0.15) + ([scores.acidityTotal, scores.freshFruitTotal, scores.brownFruitTotal, scores.vegetalTotal, scores.floralTotal, scores.woodTotal, scores.spiceTotal, scores.nutTotal, scores.caramelPanela].reduce((a, b) => a + b, 0) / 9))).toFixed(2)}` :
                   '0.00'}
                </span>
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {t('dashboard.sensoryEvaluation.scoring.totalDefects', { value: scores.defectsTotal.toFixed(1) })}
                {scores.defectsTotal >= 7 && <span className="ml-2 font-bold">{t('dashboard.sensoryEvaluation.scoring.autoDisqualification')}</span>}
                {scores.defectsTotal >= 3 && scores.defectsTotal < 7 && <span className="ml-2">{t('dashboard.sensoryEvaluation.scoring.proportionalPenalty')}</span>}
                {scores.defectsTotal < 3 && <span className="ml-2">{t('dashboard.sensoryEvaluation.scoring.noPenalty')}</span>}
              </div>
            </div>

            {/* Final Score */}
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border-2 border-purple-500">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-purple-900 dark:text-purple-100">{t('dashboard.sensoryEvaluation.scoring.finalScore')}</span>
                <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {overallQuality.toFixed(2)}/10
                </span>
              </div>
              <div className="mt-2 text-sm text-purple-700 dark:text-purple-300">
                {scores.defectsTotal >= 7 ? 
                  t('dashboard.sensoryEvaluation.scoring.disqualificationMessage') :
                  `${t('dashboard.sensoryEvaluation.scoring.mainScore', { score: ((scores.cacao * 0.40 + scores.bitterness * 0.25 + scores.astringency * 0.20 + scores.roastDegree * 0.15)).toFixed(2) })} + ${t('dashboard.sensoryEvaluation.scoring.complementaryScore', { score: (([scores.acidityTotal, scores.freshFruitTotal, scores.brownFruitTotal, scores.vegetalTotal, scores.floralTotal, scores.woodTotal, scores.spiceTotal, scores.nutTotal, scores.caramelPanela].reduce((a, b) => a + b, 0) / 9)).toFixed(2) })}${scores.defectsTotal >= 3 ? ` - ${t('dashboard.sensoryEvaluation.scoring.penalty', { value: ((scores.defectsTotal / 10) * ((scores.cacao * 0.40 + scores.bitterness * 0.25 + scores.astringency * 0.20 + scores.roastDegree * 0.15) + ([scores.acidityTotal, scores.freshFruitTotal, scores.brownFruitTotal, scores.vegetalTotal, scores.floralTotal, scores.woodTotal, scores.spiceTotal, scores.nutTotal, scores.caramelPanela].reduce((a, b) => a + b, 0) / 9))).toFixed(2) })}` : ''}`
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Breakdown Panel - For Chocolate */}
      {selectedCategory === 'chocolate' && scores.chocolate && (
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{t('dashboard.sensoryEvaluation.scoring.scoreBreakdown')}</span>
            </CardTitle>
            <CardDescription>Detailed calculation of the final score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const breakdown = getChocolateScoringBreakdown(scores.chocolate);
              return (
                <>
                  {/* Flavor - 40% */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-amber-800 dark:text-amber-200">Flavor (40%)</span>
                      <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                        {breakdown.flavor.score.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                      <div className="flex justify-between">
                        <span>• Sweetness: {scores.chocolate.flavor.sweetness.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Bitterness: {scores.chocolate.flavor.bitterness.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Acidity: {scores.chocolate.flavor.acidity.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Flavor Intensity: {scores.chocolate.flavor.flavorIntensity.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        <div className="flex justify-between font-medium">
                          <span>Weighted Contribution:</span>
                          <span>{breakdown.flavor.weightedScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aroma - 25% */}
                  <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-rose-800 dark:text-rose-200">Aroma (25%)</span>
                      <span className="text-lg font-bold text-rose-900 dark:text-rose-100">
                        {breakdown.aroma.score.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-rose-700 dark:text-rose-300">
                      <div className="flex justify-between">
                        <span>• Aromatic Intensity: {scores.chocolate.aroma.aromaIntensity.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Aromatic Quality: {scores.chocolate.aroma.aromaQuality.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-800">
                        <div className="flex justify-between font-medium">
                          <span>Weighted Contribution:</span>
                          <span>{breakdown.aroma.weightedScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Texture - 20% */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-blue-800 dark:text-blue-200">Texture (20%)</span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {breakdown.texture.score.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <div className="flex justify-between">
                        <span>• Smoothness: {scores.chocolate.texture.smoothness.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Melting: {scores.chocolate.texture.melting.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Body: {scores.chocolate.texture.body.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between font-medium">
                          <span>Weighted Contribution:</span>
                          <span>{breakdown.texture.weightedScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aftertaste - 10% */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">Aftertaste (10%)</span>
                      <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {breakdown.aftertaste.score.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                      <div className="flex justify-between">
                        <span>• Persistence: {scores.chocolate.aftertaste.persistence.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Aftertaste Quality: {scores.chocolate.aftertaste.aftertasteQuality.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Final Balance: {scores.chocolate.aftertaste.finalBalance.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                        <div className="flex justify-between font-medium">
                          <span>Weighted Contribution:</span>
                          <span>{breakdown.aftertaste.weightedScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appearance - 5% */}
                  <div className="bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Appearance (5%)</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {breakdown.appearance.score.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>• Color: {scores.chocolate.appearance.color.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Gloss: {scores.chocolate.appearance.gloss.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Surface Homogeneity: {scores.chocolate.appearance.surfaceHomogeneity.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between font-medium">
                          <span>Weighted Contribution:</span>
                          <span>{breakdown.appearance.weightedScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Score */}
                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border-2 border-purple-500">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-purple-900 dark:text-purple-100">FINAL SCORE</span>
                      <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {breakdown.overall.toFixed(2)}/10
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-purple-700 dark:text-purple-300 break-words">
                      <span className="font-medium">Formula:</span> (Flavor × 0.40) + (Aroma × 0.25) + (Texture × 0.20) + (Aftertaste × 0.10) + (Appearance × 0.05)
                    </div>
                    <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 break-words">
                      = ({breakdown.flavor.score.toFixed(2)} × 0.40) + ({breakdown.aroma.score.toFixed(2)} × 0.25) + ({breakdown.texture.score.toFixed(2)} × 0.20) + ({breakdown.aftertaste.score.toFixed(2)} × 0.10) + ({breakdown.appearance.score.toFixed(2)} × 0.05)
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Meta Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.sensoryEvaluation.metaInformation.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('dashboard.sensoryEvaluation.metaInformation.fields.date')}</label>
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={meta.evaluationDate || ''} onChange={e => setMeta({ ...meta, evaluationDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t('dashboard.sensoryEvaluation.metaInformation.fields.time')}</label>
                <input type="time" className="w-full border rounded px-3 py-2 text-sm" value={meta.evaluationTime || ''} onChange={e => setMeta({ ...meta, evaluationTime: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('dashboard.sensoryEvaluation.metaInformation.fields.evaluatorName')}</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={meta.evaluatorName || ''} onChange={e => setMeta({ ...meta, evaluatorName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('dashboard.sensoryEvaluation.metaInformation.fields.sampleCode')}</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={meta.sampleCode || ''} onChange={e => setMeta({ ...meta, sampleCode: e.target.value })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="text-xs text-muted-foreground block mb-1">{t('dashboard.sensoryEvaluation.metaInformation.fields.sampleNotes')}</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={meta.sampleNotes || ''} onChange={e => setMeta({ ...meta, sampleNotes: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Main Attributes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <CardTitle>{t('dashboard.sensoryEvaluation.intensityScale.title')}</CardTitle>
              <CardDescription>{t('dashboard.sensoryEvaluation.intensityScale.description')}</CardDescription>
            </div>
            <div className="lg:min-w-[220px] w-full lg:w-auto">
              <label className="block text-xs text-muted-foreground mb-1">{t('dashboard.sensoryEvaluation.intensityScale.sampleCategory')}</label>
              <div className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                {category === 'cocoa_bean' ? t('dashboard.sensoryEvaluation.intensityScale.sampleTypes.cocoaBean') : 
                 category === 'cocoa_liquor' ? t('dashboard.sensoryEvaluation.intensityScale.sampleTypes.cocoaLiquor') : 
                 category === 'chocolate' ? t('dashboard.sensoryEvaluation.intensityScale.sampleTypes.chocolate') : t('dashboard.sensoryEvaluation.intensityScale.sampleTypes.unknown')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show cocoa-specific evaluation for cocoa bean/liquor */}
          {selectedCategory !== 'chocolate' && (
            <>
              {/* Categorized attributes with visual differentiation */}
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs justify-center sm:justify-start">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded">
                      <span className="text-blue-600">★</span>
                      <span>{t('dashboard.sensoryEvaluation.intensityScale.categories.main')}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded">
                      <span className="text-green-600">◆</span>
                      <span>{t('dashboard.sensoryEvaluation.intensityScale.categories.complementary')}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
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
                    tooltip={attributeTooltips[attribute.key]}
                  />
                ))}
              </div>
            </>
          )}

          <Separator className="my-2" />

          {category === 'cocoa_liquor' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Typical Odors */}
              <div className="space-y-3">
                <div className="font-medium text-green-700 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Typical</span>
                </div>
                <CheckboxRow label="Clean cacao" checked={scores.typicalOdors?.cleanCacao || false} onChange={(v) => updateOdor('typicalOdors', 'cleanCacao', v)} />
                <CheckboxRow label="Chocolate" checked={scores.typicalOdors?.chocolate || false} onChange={(v) => updateOdor('typicalOdors', 'chocolate', v)} />
                <CheckboxRow label="Ripe fruit" checked={scores.typicalOdors?.ripeFruit || false} onChange={(v) => updateOdor('typicalOdors', 'ripeFruit', v)} />
                <CheckboxRow label="Floral" checked={scores.typicalOdors?.floral || false} onChange={(v) => updateOdor('typicalOdors', 'floral', v)} />
                <CheckboxRow label="Spicy" checked={scores.typicalOdors?.spicy || false} onChange={(v) => updateOdor('typicalOdors', 'spicy', v)} />
                <CheckboxRow label="Caramel / sweet" checked={scores.typicalOdors?.caramelSweet || false} onChange={(v) => updateOdor('typicalOdors', 'caramelSweet', v)} />
                <CheckboxRow label="Honey / molasses" checked={scores.typicalOdors?.honeyMolasses || false} onChange={(v) => updateOdor('typicalOdors', 'honeyMolasses', v)} />
                <CheckboxRow label="Dried fruits" checked={scores.typicalOdors?.driedFruits || false} onChange={(v) => updateOdor('typicalOdors', 'driedFruits', v)} />
                <CheckboxRow label="Citrus" checked={scores.typicalOdors?.citrus || false} onChange={(v) => updateOdor('typicalOdors', 'citrus', v)} />
                <CheckboxRow label="Fresh herbal" checked={scores.typicalOdors?.freshHerbal || false} onChange={(v) => updateOdor('typicalOdors', 'freshHerbal', v)} />
                <CheckboxRow label="Buttery / soft dairy" checked={scores.typicalOdors?.butterySoftDairy || false} onChange={(v) => updateOdor('typicalOdors', 'butterySoftDairy', v)} />
                <CheckboxRow label="Light smoky" checked={scores.typicalOdors?.lightSmoky || false} onChange={(v) => updateOdor('typicalOdors', 'lightSmoky', v)} />
              </div>
              
              {/* Atypical Odors */}
              <div className="space-y-3">
                <div className="font-medium text-red-700 flex items-center gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>Atypical</span>
                </div>
                <CheckboxRow label="Excess fermentation" checked={scores.atypicalOdors?.excessFermentation || false} onChange={(v) => updateOdor('atypicalOdors', 'excessFermentation', v)} />
                <CheckboxRow label="Mold / damp" checked={scores.atypicalOdors?.moldDamp || false} onChange={(v) => updateOdor('atypicalOdors', 'moldDamp', v)} />
                <CheckboxRow label="Earth / clay" checked={scores.atypicalOdors?.earthClay || false} onChange={(v) => updateOdor('atypicalOdors', 'earthClay', v)} />
                <CheckboxRow label="Intense smoke / burnt" checked={scores.atypicalOdors?.intenseSmokeOrBurnt || false} onChange={(v) => updateOdor('atypicalOdors', 'intenseSmokeOrBurnt', v)} />
                <CheckboxRow label="Rancid / oxidized" checked={scores.atypicalOdors?.rancidOxidized || false} onChange={(v) => updateOdor('atypicalOdors', 'rancidOxidized', v)} />
                <CheckboxRow label="Medicinal / chemical" checked={scores.atypicalOdors?.medicinalChemical || false} onChange={(v) => updateOdor('atypicalOdors', 'medicinalChemical', v)} />
                <CheckboxRow label="Animal / leather" checked={scores.atypicalOdors?.animalLeather || false} onChange={(v) => updateOdor('atypicalOdors', 'animalLeather', v)} />
                <CheckboxRow label="Soap / detergent" checked={scores.atypicalOdors?.soapDetergent || false} onChange={(v) => updateOdor('atypicalOdors', 'soapDetergent', v)} />
                <CheckboxRow label="Pronounced tannic note" checked={scores.atypicalOdors?.pronouncedTannicNote || false} onChange={(v) => updateOdor('atypicalOdors', 'pronouncedTannicNote', v)} />
                <CheckboxRow label="Sulfurous / rotten egg" checked={scores.atypicalOdors?.sulfurousRottenEgg || false} onChange={(v) => updateOdor('atypicalOdors', 'sulfurousRottenEgg', v)} />
                <CheckboxRow label="Fuel (gasoline, diesel)" checked={scores.atypicalOdors?.fuelGasolineDiesel || false} onChange={(v) => updateOdor('atypicalOdors', 'fuelGasolineDiesel', v)} />
                <CheckboxRow label="Industrial solvents (paint, glue, thinner)" checked={scores.atypicalOdors?.industrialSolvents || false} onChange={(v) => updateOdor('atypicalOdors', 'industrialSolvents', v)} />
              </div>
            </div>
          )}
          
          {selectedCategory !== 'chocolate' && (
            <>
              <Separator className="my-2" />
              {/* Sub-attributes that feed the totals (exact per your schema) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.fruity')} value={scores.acidity.frutal} onChange={(v) => updateSub('acidity', 'frutal', v)} tooltip={subAttributeTooltips.frutal} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acetic')} value={scores.acidity.acetic} onChange={(v) => updateSub('acidity', 'acetic', v)} tooltip={subAttributeTooltips.acetic} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.lactic')} value={scores.acidity.lactic} onChange={(v) => updateSub('acidity', 'lactic', v)} tooltip={subAttributeTooltips.lactic} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.mineralButyric')} value={scores.acidity.mineralButyric} onChange={(v) => updateSub('acidity', 'mineralButyric', v)} tooltip={subAttributeTooltips.mineralButyric} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.berries')} value={scores.freshFruit.berries} onChange={(v) => updateSub('freshFruit', 'berries', v)} tooltip={subAttributeTooltips.berries} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.citrus')} value={scores.freshFruit.citrus} onChange={(v) => updateSub('freshFruit', 'citrus', v)} tooltip={subAttributeTooltips.citrus} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.yellowPulp')} value={scores.freshFruit.yellowPulp} onChange={(v) => updateSub('freshFruit', 'yellowPulp', v)} tooltip={subAttributeTooltips.yellowPulp} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.dark')} value={scores.freshFruit.dark} onChange={(v) => updateSub('freshFruit', 'dark', v)} tooltip={subAttributeTooltips.darkFruit} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.tropical')} value={scores.freshFruit.tropical} onChange={(v) => updateSub('freshFruit', 'tropical', v)} tooltip={subAttributeTooltips.tropical} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brownFruit')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.dry')} value={scores.brownFruit.dry} onChange={(v) => updateSub('brownFruit', 'dry', v)} tooltip={subAttributeTooltips.dry} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brown')} value={scores.brownFruit.brown} onChange={(v) => updateSub('brownFruit', 'brown', v)} tooltip={subAttributeTooltips.brown} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.overripe')} value={scores.brownFruit.overripe} onChange={(v) => updateSub('brownFruit', 'overripe', v)} tooltip={subAttributeTooltips.overripe} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.vegetal')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.grassHerb')} value={scores.vegetal.grassHerb} onChange={(v) => updateSub('vegetal', 'grassHerb', v)} tooltip={subAttributeTooltips.grassHerb} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.earthy')} value={scores.vegetal.earthy} onChange={(v) => updateSub('vegetal', 'earthy', v)} tooltip={subAttributeTooltips.earthy} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.floral')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.orangeBlossom')} value={scores.floral.orangeBlossom} onChange={(v) => updateSub('floral', 'orangeBlossom', v)} tooltip={subAttributeTooltips.orangeBlossom} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.flowers')} value={scores.floral.flowers} onChange={(v) => updateSub('floral', 'flowers', v)} tooltip={subAttributeTooltips.flowers} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.wood')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.light')} value={scores.wood.light} onChange={(v) => updateSub('wood', 'light', v)} tooltip={subAttributeTooltips.lightWood} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.woodDark')} value={scores.wood.dark} onChange={(v) => updateSub('wood', 'dark', v)} tooltip={subAttributeTooltips.darkWood} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.resin')} value={scores.wood.resin} onChange={(v) => updateSub('wood', 'resin', v)} tooltip={subAttributeTooltips.resin} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spice')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spices')} value={scores.spice.spices} onChange={(v) => updateSub('spice', 'spices', v)} tooltip={subAttributeTooltips.spices} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.tobacco')} value={scores.spice.tobacco} onChange={(v) => updateSub('spice', 'tobacco', v)} tooltip={subAttributeTooltips.tobacco} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.umami')} value={scores.spice.umami} onChange={(v) => updateSub('spice', 'umami', v)} tooltip={subAttributeTooltips.umami} />
            </div>
            <div className="space-y-3">
              <div className="font-medium">{t('dashboard.sensoryEvaluation.intensityScale.subAttributes.nut')}</div>
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.kernel')} value={scores.nut.kernel} onChange={(v) => updateSub('nut', 'kernel', v)} tooltip={subAttributeTooltips.kernel} />
              <SliderRow label={t('dashboard.sensoryEvaluation.intensityScale.subAttributes.skin')} value={scores.nut.skin} onChange={(v) => updateSub('nut', 'skin', v)} tooltip={subAttributeTooltips.skin} />
              </div>
              </div>
            </>
          )}

          {/* Comprehensive Chocolate Evaluation */}
          {selectedCategory === 'chocolate' && scores.chocolate && (
            <div>
              <Separator className="my-6" />
              <div className="text-lg font-semibold mb-4">Chocolate Sensory Evaluation</div>
              
              {/* 1 Appearance */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">1. Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Color (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Very light / atypical for the type | 4-6.9: Acceptable color but irregular | 7-10: Ideal and characteristic color
                    </div>
                    <SliderRow 
                      label="Color" 
                      value={scores.chocolate.appearance.color} 
                      onChange={(v) => updateChocolateAttribute('appearance', 'color', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gloss (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3: Dull / no shine | 4-6.9: Medium shine / patchy | 7-10: Uniform and attractive shine
                    </div>
                    <SliderRow 
                      label="Gloss" 
                      value={scores.chocolate.appearance.gloss} 
                      onChange={(v) => updateChocolateAttribute('appearance', 'gloss', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Surface Homogeneity (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Irregular surface / defects | 4-6.9: Acceptable with minor imperfections | 7-10: Perfectly homogeneous
                    </div>
                    <SliderRow 
                      label="Surface Homogeneity" 
                      value={scores.chocolate.appearance.surfaceHomogeneity} 
                      onChange={(v) => updateChocolateAttribute('appearance', 'surfaceHomogeneity', v)} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2 Aroma */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">2. Aroma</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Aroma Intensity (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Imperceptible aroma | 4-6.9: Moderate but subtle aroma | 7-10: Intense and enveloping aroma
                    </div>
                    <SliderRow 
                      label="Aroma Intensity" 
                      value={scores.chocolate.aroma.aromaIntensity} 
                      onChange={(v) => updateChocolateAttribute('aroma', 'aromaIntensity', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Aroma Quality (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Unpleasant / defective aromas | 4-6.9: Neutral / simple aromas | 7-10: Complex and pleasant aromas
                    </div>
                    <SliderRow 
                      label="Aroma Quality" 
                      value={scores.chocolate.aroma.aromaQuality} 
                      onChange={(v) => updateChocolateAttribute('aroma', 'aromaQuality', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Specific Notes (0-10 each, multiple selection)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <SliderRow label="Floral" value={scores.chocolate.aroma.specificNotes.floral} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.floral', v)} />
                      <SliderRow label="Fruity" value={scores.chocolate.aroma.specificNotes.fruity} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.fruity', v)} />
                      <SliderRow label="Toasted" value={scores.chocolate.aroma.specificNotes.toasted} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.toasted', v)} />
                      <SliderRow label="Hazelnut" value={scores.chocolate.aroma.specificNotes.hazelnut} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.hazelnut', v)} />
                      <SliderRow label="Earthy" value={scores.chocolate.aroma.specificNotes.earthy} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.earthy', v)} />
                      <SliderRow label="Spicy" value={scores.chocolate.aroma.specificNotes.spicy} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.spicy', v)} />
                      <SliderRow label="Milky" value={scores.chocolate.aroma.specificNotes.milky} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.milky', v)} />
                      <SliderRow label="Woody" value={scores.chocolate.aroma.specificNotes.woody} onChange={(v) => updateChocolateAttribute('aroma', 'specificNotes.woody', v)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3 Texture */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">3. Texture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Smoothness (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Rough / grainy | 4-6.9: Regular texture | 7-10: Silky and smooth
                    </div>
                    <SliderRow 
                      label="Smoothness" 
                      value={scores.chocolate.texture.smoothness} 
                      onChange={(v) => updateChocolateAttribute('texture', 'smoothness', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Melting (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Melts too fast / too slow | 4-6.9: Irregular melting | 7-10: Gradual and uniform melting
                    </div>
                    <SliderRow 
                      label="Melting" 
                      value={scores.chocolate.texture.melting} 
                      onChange={(v) => updateChocolateAttribute('texture', 'melting', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Body (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Weak / watery body | 4-6.9: Medium body | 7-10: Full and creamy body
                    </div>
                    <SliderRow 
                      label="Body" 
                      value={scores.chocolate.texture.body} 
                      onChange={(v) => updateChocolateAttribute('texture', 'body', v)} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 4 Flavor */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">4. Flavor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Sweetness (0-10)</label>
                      <div className="text-xs text-muted-foreground mb-2">
                        0-3.9: Too sweet / bitter | 4-6.9: Acceptable balance | 7-10: Perfectly balanced sweetness
                      </div>
                      <SliderRow 
                        label="Sweetness" 
                        value={scores.chocolate.flavor.sweetness} 
                        onChange={(v) => updateChocolateAttribute('flavor', 'sweetness', v)} 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bitterness (0-10)</label>
                      <div className="text-xs text-muted-foreground mb-2">
                        0-3.9: Unpleasant bitterness | 4-6.9: Present but acceptable | 7-10: Characteristic and pleasant bitterness
                      </div>
                      <SliderRow 
                        label="Bitterness" 
                        value={scores.chocolate.flavor.bitterness} 
                        onChange={(v) => updateChocolateAttribute('flavor', 'bitterness', v)} 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Acidity (0-10)</label>
                      <div className="text-xs text-muted-foreground mb-2">
                        0-3.9: Unbalanced acidity | 5-6.9: Perceptible but not annoying | 7-10: Bright and balanced acidity
                      </div>
                      <SliderRow 
                        label="Acidity" 
                        value={scores.chocolate.flavor.acidity} 
                        onChange={(v) => updateChocolateAttribute('flavor', 'acidity', v)} 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Flavor Intensity (0-10)</label>
                      <div className="text-xs text-muted-foreground mb-2">
                        2-3.9: Weak / diluted flavors | 4-6.9: Moderate flavors | 7-10: Intense and defined flavors
                      </div>
                      <SliderRow 
                        label="Flavor Intensity" 
                        value={scores.chocolate.flavor.flavorIntensity} 
                        onChange={(v) => updateChocolateAttribute('flavor', 'flavorIntensity', v)} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Flavor Notes (0-10 each, multiple selection)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <SliderRow label="Citrus" value={scores.chocolate.flavor.flavorNotes.citrus} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.citrus', v)} />
                      <SliderRow label="Red Fruits" value={scores.chocolate.flavor.flavorNotes.redFruits} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.redFruits', v)} />
                      <SliderRow label="Nuts" value={scores.chocolate.flavor.flavorNotes.nuts} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.nuts', v)} />
                      <SliderRow label="Caramel" value={scores.chocolate.flavor.flavorNotes.caramel} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.caramel', v)} />
                      <SliderRow label="Malt" value={scores.chocolate.flavor.flavorNotes.malt} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.malt', v)} />
                      <SliderRow label="Wood" value={scores.chocolate.flavor.flavorNotes.wood} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.wood', v)} />
                      <SliderRow label="Spices" value={scores.chocolate.flavor.flavorNotes.spices} onChange={(v) => updateChocolateAttribute('flavor', 'flavorNotes.spices', v)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5 Aftertaste */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">5. Aftertaste</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Persistence (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Disappears immediately | 4-6.9: Medium persistence (30-60 seconds) | 7-10: Long persistence (+90 seconds)
                    </div>
                    <SliderRow 
                      label="Persistence" 
                      value={scores.chocolate.aftertaste.persistence} 
                      onChange={(v) => updateChocolateAttribute('aftertaste', 'persistence', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Aftertaste Quality (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Unpleasant | 4-6.9: Neutral / acceptable | 7-10: Clean and pleasant
                    </div>
                    <SliderRow 
                      label="Aftertaste Quality" 
                      value={scores.chocolate.aftertaste.aftertasteQuality} 
                      onChange={(v) => updateChocolateAttribute('aftertaste', 'aftertasteQuality', v)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Final Balance (0-10)</label>
                    <div className="text-xs text-muted-foreground mb-2">
                      0-3.9: Unbalanced with residual flavors | 4-6.9: Acceptable balance | 7-10: Perfect and harmonious balance
                    </div>
                    <SliderRow 
                      label="Final Balance" 
                      value={scores.chocolate.aftertaste.finalBalance} 
                      onChange={(v) => updateChocolateAttribute('aftertaste', 'finalBalance', v)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Legacy sweetness for backward compatibility */}
          {selectedCategory === 'chocolate' && !scores.chocolate && (
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
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.dirty')} value={scores.defects.dirty} onChange={(v) => updateDefect('dirty', v)} tooltip={subAttributeTooltips.dirty} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.animal')} value={scores.defects.animal} onChange={(v) => updateDefect('animal', v)} tooltip={subAttributeTooltips.animal} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.rotten')} value={scores.defects.rotten} onChange={(v) => updateDefect('rotten', v)} tooltip={subAttributeTooltips.rotten} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.smoke')} value={scores.defects.smoke} onChange={(v) => updateDefect('smoke', v)} tooltip={subAttributeTooltips.smoke} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.humid')} value={scores.defects.humid} onChange={(v) => updateDefect('humid', v)} tooltip={subAttributeTooltips.humid} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.moldy')} value={scores.defects.moldy} onChange={(v) => updateDefect('moldy', v)} tooltip={subAttributeTooltips.moldy} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.overfermented')} value={scores.defects.overfermented} onChange={(v) => updateDefect('overfermented', v)} tooltip={subAttributeTooltips.overfermented} />
          <DefectRow label={t('dashboard.sensoryEvaluation.defects.labels.other')} value={scores.defects.other} onChange={(v) => updateDefect('other', v)} tooltip={subAttributeTooltips.other} />
          
          {/* Defect Total and Alerts */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total Defects:</span>
              <span className="text-lg font-bold">{scores.defectsTotal.toFixed(1)}/10</span>
            </div>
            
            {/* Visual Alerts for Defect Thresholds */}
            {scores.defectsTotal >= 7 && (
              <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg p-3 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🚫</span>
                  <div>
                    <div className="font-bold text-red-800 dark:text-red-200">AUTOMATIC DISQUALIFICATION</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Defects ≥ 7 points: Sample will receive a score of 0</div>
                  </div>
                </div>
              </div>
            )}
            
            {scores.defectsTotal >= 3 && scores.defectsTotal < 7 && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-3 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-yellow-800 dark:text-yellow-200">PROPORTIONAL PENALTY APPLIED</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Defects between 3-6 points: Penalty = ({scores.defectsTotal.toFixed(1)} / 10) × Base Score
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {scores.defectsTotal < 3 && scores.defectsTotal > 0 && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg p-2 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✓</span>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Defects &lt; 3 points: No penalty applied
                  </div>
                </div>
              </div>
            )}
          </div>
          
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:space-x-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {t('dashboard.sensoryEvaluation.actions.cancel')}
          </Button>
        )}
        <Button onClick={handleSubmit} className="w-full sm:w-auto">
          {t('dashboard.sensoryEvaluation.actions.completeEvaluation')}
        </Button>
      </div>

      {/* Defect Confirmation Dialog */}
      <Dialog open={showDefectConfirmation} onOpenChange={setShowDefectConfirmation}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span>Confirm Evaluation Submission</span>
            </DialogTitle>
            <DialogDescription>
              This sample has significant defects that will impact the final score.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Defect Summary
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <div>Total Defects: <strong>{scores.defectsTotal.toFixed(1)}/10</strong></div>
                {scores.defectsTotal >= 7 && (
                  <div className="text-red-600 dark:text-red-400 font-bold mt-2">
                    ⚠️ This sample will be DISQUALIFIED (defects ≥ 7)
                  </div>
                )}
                {scores.defectsTotal >= 3 && scores.defectsTotal < 7 && (
                  <div className="mt-2">
                    A proportional penalty will be applied: <strong>{((scores.defectsTotal / 10) * 100).toFixed(0)}%</strong> of the base score
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Final Score Preview
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {overallQuality.toFixed(2)}/10
              </div>
              {scores.defectsTotal >= 7 && (
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Sample will receive a score of 0 due to disqualification
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              Please review the defect scores carefully before submitting. Once submitted, this evaluation will be recorded with the calculated penalties.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDefectConfirmation(false)}>
              Review Defects
            </Button>
            <Button onClick={handleSubmit} variant={scores.defectsTotal >= 7 ? "destructive" : "default"}>
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default SensoryEvaluationForm;