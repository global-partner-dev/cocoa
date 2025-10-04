import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { SensoryEvaluationData } from "@/lib/sensoryEvaluationService";

interface SensoryEvaluationDetailsProps {
  evaluation: SensoryEvaluationData;
  onBack: () => void;
}

const SensoryEvaluationDetails: React.FC<SensoryEvaluationDetailsProps> = ({ evaluation, onBack }) => {
  const { t } = useTranslation();

  const ScoreDisplay = ({ label, value, tooltip }: { label: string; value: number; tooltip?: string }) => (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className="font-mono">
        {value.toFixed(1)}
      </Badge>
    </div>
  );

  const SubAttributeGroup = ({ title, attributes }: { title: string; attributes: { label: string; value: number }[] }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-[hsl(var(--chocolate-dark))]">{title}</h4>
      <div className="pl-4 space-y-1">
        {attributes.map((attr, idx) => (
          <ScoreDisplay key={idx} label={attr.label} value={attr.value} />
        ))}
      </div>
    </div>
  );

  const isChocolateEvaluation = evaluation.evaluationType === 'chocolate';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
            {t('dashboard.sensoryEvaluation.detailsTitle')}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {evaluation.sampleCode} - {evaluation.evaluatorName}
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          {t('evaluationSupervision.details.back')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meta Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.metaInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.evaluationDate')}</p>
                  <p className="font-medium">{evaluation.evaluationDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.evaluationTime')}</p>
                  <p className="font-medium">{evaluation.evaluationTime}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.evaluationType')}</p>
                  <Badge>{t(`dashboard.sensoryEvaluation.evaluationTypes.${evaluation.evaluationType}`)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.verdict')}</p>
                  <Badge variant={evaluation.verdict === 'Approved' ? 'default' : 'destructive'}>
                    {t(`dashboard.sensoryEvaluation.verdicts.${evaluation.verdict.toLowerCase()}`)}
                  </Badge>
                </div>
              </div>
              {evaluation.sampleNotes && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">{t('dashboard.sensoryEvaluation.sampleNotes')}</p>
                  <p className="text-sm mt-1">{evaluation.sampleNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Attributes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.mainAttributes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreDisplay label={t('dashboard.sensoryEvaluation.intensityScale.attributes.cacao')} value={evaluation.cacao} />
              <ScoreDisplay label={t('dashboard.sensoryEvaluation.intensityScale.attributes.bitterness')} value={evaluation.bitterness} />
              <ScoreDisplay label={t('dashboard.sensoryEvaluation.intensityScale.attributes.astringency')} value={evaluation.astringency} />
              <ScoreDisplay label={t('dashboard.sensoryEvaluation.intensityScale.attributes.caramelPanela')} value={evaluation.caramelPanela} />
              <ScoreDisplay label={t('dashboard.sensoryEvaluation.intensityScale.attributes.roastDegree')} value={evaluation.roastDegree} />
            </CardContent>
          </Card>

          {/* Acidity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.acidityTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.acidityTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity.frutal'), value: evaluation.acidity.frutal },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity.acetic'), value: evaluation.acidity.acetic },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity.lactic'), value: evaluation.acidity.lactic },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.acidity.mineralButyric'), value: evaluation.acidity.mineralButyric },
                ]}
              />
            </CardContent>
          </Card>

          {/* Fresh Fruit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.freshFruitTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.freshFruitTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit.berries'), value: evaluation.freshFruit.berries },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit.citrus'), value: evaluation.freshFruit.citrus },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit.yellowPulp'), value: evaluation.freshFruit.yellowPulp },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit.dark'), value: evaluation.freshFruit.dark },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.freshFruit.tropical'), value: evaluation.freshFruit.tropical },
                ]}
              />
            </CardContent>
          </Card>

          {/* Brown Fruit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.brownFruitTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.brownFruitTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brownFruit.dry'), value: evaluation.brownFruit.dry },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brownFruit.brown'), value: evaluation.brownFruit.brown },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.brownFruit.overripe'), value: evaluation.brownFruit.overripe },
                ]}
              />
            </CardContent>
          </Card>

          {/* Vegetal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.vegetalTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.vegetalTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.vegetal.grassHerb'), value: evaluation.vegetal.grassHerb },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.vegetal.earthy'), value: evaluation.vegetal.earthy },
                ]}
              />
            </CardContent>
          </Card>

          {/* Floral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.floralTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.floralTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.floral.orangeBlossom'), value: evaluation.floral.orangeBlossom },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.floral.flowers'), value: evaluation.floral.flowers },
                ]}
              />
            </CardContent>
          </Card>

          {/* Wood */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.woodTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.woodTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.wood.light'), value: evaluation.wood.light },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.wood.dark'), value: evaluation.wood.dark },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.wood.resin'), value: evaluation.wood.resin },
                ]}
              />
            </CardContent>
          </Card>

          {/* Spice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.spiceTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.spiceTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spice.spices'), value: evaluation.spice.spices },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spice.tobacco'), value: evaluation.spice.tobacco },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.spice.umami'), value: evaluation.spice.umami },
                ]}
              />
            </CardContent>
          </Card>

          {/* Nut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.intensityScale.attributes.nutTotal')}</CardTitle>
              <Badge variant="outline" className="w-fit">{evaluation.nutTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.subAttributes')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.nut.kernel'), value: evaluation.nut.kernel },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.nut.skin'), value: evaluation.nut.skin },
                ]}
              />
            </CardContent>
          </Card>

          {/* Defects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-red-600">{t('dashboard.sensoryEvaluation.intensityScale.attributes.defectsTotal')}</CardTitle>
              <Badge variant="destructive" className="w-fit">{evaluation.defectsTotal.toFixed(1)}</Badge>
            </CardHeader>
            <CardContent>
              <SubAttributeGroup
                title={t('dashboard.sensoryEvaluation.defects')}
                attributes={[
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.dirty'), value: evaluation.defects.dirty },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.animal'), value: evaluation.defects.animal },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.rotten'), value: evaluation.defects.rotten },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.smoke'), value: evaluation.defects.smoke },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.humid'), value: evaluation.defects.humid },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.moldy'), value: evaluation.defects.moldy },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.overfermented'), value: evaluation.defects.overfermented },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.other'), value: evaluation.defects.other },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.excessiveAstringency'), value: evaluation.defects.excessiveAstringency },
                  { label: t('dashboard.sensoryEvaluation.intensityScale.subAttributes.defects.unbalancedBitterness'), value: evaluation.defects.unbalancedBitterness },
                ]}
              />
            </CardContent>
          </Card>

          {/* Chocolate-specific attributes */}
          {isChocolateEvaluation && evaluation.chocolateData && (
            <>
              {/* Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.chocolate.appearance.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubAttributeGroup
                    title=""
                    attributes={[
                      { label: t('dashboard.sensoryEvaluation.chocolate.appearance.color'), value: evaluation.chocolateData.appearance.color },
                      { label: t('dashboard.sensoryEvaluation.chocolate.appearance.gloss'), value: evaluation.chocolateData.appearance.gloss },
                      { label: t('dashboard.sensoryEvaluation.chocolate.appearance.surfaceHomogeneity'), value: evaluation.chocolateData.appearance.surfaceHomogeneity },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Aroma */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.chocolate.aroma.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.aroma.aromaIntensity')} value={evaluation.chocolateData.aroma.aromaIntensity} />
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.aroma.aromaQuality')} value={evaluation.chocolateData.aroma.aromaQuality} />
                  <Separator />
                  <SubAttributeGroup
                    title={t('dashboard.sensoryEvaluation.chocolate.aroma.specificNotes')}
                    attributes={[
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.floral'), value: evaluation.chocolateData.aroma.specificNotes.floral },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.fruity'), value: evaluation.chocolateData.aroma.specificNotes.fruity },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.toasted'), value: evaluation.chocolateData.aroma.specificNotes.toasted },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.hazelnut'), value: evaluation.chocolateData.aroma.specificNotes.hazelnut },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.earthy'), value: evaluation.chocolateData.aroma.specificNotes.earthy },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.spicy'), value: evaluation.chocolateData.aroma.specificNotes.spicy },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.milky'), value: evaluation.chocolateData.aroma.specificNotes.milky },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aroma.notes.woody'), value: evaluation.chocolateData.aroma.specificNotes.woody },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Texture */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.chocolate.texture.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubAttributeGroup
                    title=""
                    attributes={[
                      { label: t('dashboard.sensoryEvaluation.chocolate.texture.smoothness'), value: evaluation.chocolateData.texture.smoothness },
                      { label: t('dashboard.sensoryEvaluation.chocolate.texture.melting'), value: evaluation.chocolateData.texture.melting },
                      { label: t('dashboard.sensoryEvaluation.chocolate.texture.body'), value: evaluation.chocolateData.texture.body },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Flavor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.chocolate.flavor.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.flavor.sweetness')} value={evaluation.chocolateData.flavor.sweetness} />
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.flavor.bitterness')} value={evaluation.chocolateData.flavor.bitterness} />
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.flavor.acidity')} value={evaluation.chocolateData.flavor.acidity} />
                  <ScoreDisplay label={t('dashboard.sensoryEvaluation.chocolate.flavor.flavorIntensity')} value={evaluation.chocolateData.flavor.flavorIntensity} />
                  <Separator />
                  <SubAttributeGroup
                    title={t('dashboard.sensoryEvaluation.chocolate.flavor.flavorNotes')}
                    attributes={[
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.citrus'), value: evaluation.chocolateData.flavor.flavorNotes.citrus },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.redFruits'), value: evaluation.chocolateData.flavor.flavorNotes.redFruits },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.nuts'), value: evaluation.chocolateData.flavor.flavorNotes.nuts },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.caramel'), value: evaluation.chocolateData.flavor.flavorNotes.caramel },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.malt'), value: evaluation.chocolateData.flavor.flavorNotes.malt },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.wood'), value: evaluation.chocolateData.flavor.flavorNotes.wood },
                      { label: t('dashboard.sensoryEvaluation.chocolate.flavor.notes.spices'), value: evaluation.chocolateData.flavor.flavorNotes.spices },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Aftertaste */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.chocolate.aftertaste.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubAttributeGroup
                    title=""
                    attributes={[
                      { label: t('dashboard.sensoryEvaluation.chocolate.aftertaste.persistence'), value: evaluation.chocolateData.aftertaste.persistence },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aftertaste.aftertasteQuality'), value: evaluation.chocolateData.aftertaste.aftertasteQuality },
                      { label: t('dashboard.sensoryEvaluation.chocolate.aftertaste.finalBalance'), value: evaluation.chocolateData.aftertaste.finalBalance },
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.comments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluation.flavorComments && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">{t('dashboard.sensoryEvaluation.flavorComments')}</p>
                  <p className="text-sm">{evaluation.flavorComments}</p>
                </div>
              )}
              {evaluation.producerRecommendations && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">{t('dashboard.sensoryEvaluation.producerRecommendations')}</p>
                  <p className="text-sm">{evaluation.producerRecommendations}</p>
                </div>
              )}
              {evaluation.additionalPositive && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">{t('dashboard.sensoryEvaluation.additionalPositive')}</p>
                  <p className="text-sm">{evaluation.additionalPositive}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disqualification Reasons */}
          {evaluation.verdict === 'Disqualified' && evaluation.disqualificationReasons && evaluation.disqualificationReasons.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-red-600">{t('dashboard.sensoryEvaluation.disqualificationReasons')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1">
                  {evaluation.disqualificationReasons.map((reason, idx) => (
                    <li key={idx} className="text-sm">{reason}</li>
                  ))}
                </ul>
                {evaluation.otherDisqualificationReason && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">{t('dashboard.sensoryEvaluation.otherReason')}</p>
                    <p className="text-sm">{evaluation.otherDisqualificationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.overallQuality')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-[hsl(var(--chocolate-dark))]">
                  {evaluation.overallQuality.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.sensoryEvaluation.outOf10')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Typical Odors */}
          {evaluation.typicalOdors && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">{t('dashboard.sensoryEvaluation.typicalOdors')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(evaluation.typicalOdors).map(([key, value]) => 
                    value && (
                      <Badge key={key} variant="secondary" className="mr-2 mb-2">
                        {t(`dashboard.sensoryEvaluation.odors.typical.${key}`)}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Atypical Odors */}
          {evaluation.atypicalOdors && Object.values(evaluation.atypicalOdors).some(v => v) && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-orange-600">{t('dashboard.sensoryEvaluation.atypicalOdors')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(evaluation.atypicalOdors).map(([key, value]) => 
                    value && (
                      <Badge key={key} variant="destructive" className="mr-2 mb-2">
                        {t(`dashboard.sensoryEvaluation.odors.atypical.${key}`)}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SensoryEvaluationDetails;