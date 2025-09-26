import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  QrCode,
  Package,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SampleSubmissionService, type SampleSubmissionContest } from "@/lib/sampleSubmissionService";
import { SamplesService, type SampleSubmissionData } from "@/lib/samplesService";
import type { Sample } from "@/lib/samplesService";
import { useTranslation } from "react-i18next";

// Use the SampleSubmissionContest type from the service
type Contest = SampleSubmissionContest;

type ProductType = 'bean' | 'liquor' | 'chocolate';

interface SampleSubmission {
  id?: string;
  contestId: string;
  contestName: string;
  trackingCode?: string;
  qrCodeUrl?: string;

  // Product type
  productType: ProductType;

  // Bean-specific basic
  lotNumber: string;
  harvestDate: string; // YYYY-MM-DD

  // Sample Origin Data (bean form)
  country: string;
  department: string;
  municipality: string;
  district: string;
  farmName: string;
  cocoaAreaHectares: number;

  // Bean Owner Data
  ownerFullName: string;
  identificationDocument: string;
  phoneNumber: string;
  email: string;
  homeAddress: string;
  belongsToCooperative: boolean;
  cooperativeName: string;

  // Bean Sample Information
  quantity: number; // 3kg required
  geneticMaterial: string;
  cropAge: number;
  sampleSourceHectares: number;
  moistureContent: number;
  fermentationPercentage: number;
  growingAltitudeMasl: number;

  // Bean Processing Information
  fermenterType: string;
  fermentationTime: number; // in hours
  dryingType: string;
  dryingTime: number; // in hours

  // Bean Certifications
  beanCertifications: {
    organic: boolean;
    fairtrade: boolean;
    directTrade: boolean;
    none: boolean;
    other: boolean;
    otherText: string;
  };

  // Additional
  variety: string;

  // Chocolate-specific fields
  chocolateName: string;
  chocolateBrand: string;
  chocolateBatch: string;
  chocolateProductionDate: string; // YYYY-MM-DD
  chocolateManufacturerCountry: string;
  chocolateCocoaOriginCountry: string;
  chocolateRegion: string;
  chocolateMunicipality: string;
  chocolateFarmName: string;
  chocolateCocoaVariety: string;
  chocolateFermentationMethod: string;
  chocolateDryingMethod: string;
  chocolateType: string; // Dark, Milk, White, Ruby, Blend
  chocolateCocoaPercentage: number;
  chocolateCocoaButterPercentage: number;
  chocolateSweeteners: string[]; // array for possible multi-select
  chocolateSweetenerOther: string;
  chocolateLecithin: string[]; // Soy, Sunflower, None
  chocolateNaturalFlavors: string[]; // Vanilla, Cinnamon, None, Other
  chocolateNaturalFlavorsOther: string;
  chocolateAllergens: string[]; // Gluten, Lactose, Nuts, Soy, None
  chocolateCertifications: string[];
  chocolateCertificationsOther: string;
  conchingTimeHours: number;
  conchingTemperatureCelsius: number;
  temperingMethod: string; // Manual, Machine, Untempered
  finalGranulationMicrons: number;
  competitionCategory: string;

  // Liquor-specific fields (plus lot/harvest reused)
  liquorName: string;
  liquorBrand: string;
  liquorBatch: string;
  liquorProcessingDate: string; // YYYY-MM-DD
  liquorCountryProcessing: string;
  lecithinPercentage: number;
  liquorCocoaButterPercentage: number;
  grindingTemperatureCelsius: number;
  grindingTimeHours: number;
  liquorProcessingMethod: string; // Artisanal, Industrial, Mixed
  liquorCocoaOriginCountry: string; // origin of cocoa used
  liquorCocoaVariety: string;

  agreedToTerms: boolean;
}

const geneticMaterials = [
  'Trinitario',
  'Criollo',
  'Forastero',
  'Nacional',
  'CCN-51',
  'ICS-1',
  'TSH-565',
  'EET-8',
  'IMC-67',
  'SCA-6',
  'Other'
];

const fermenterTypes = [
  'Wooden Boxes',
  'Plastic Containers',
  'Concrete Tanks',
  'Banana Leaves',
  'Jute Sacks',
  'Fermentation Bags',
  'Traditional Heap',
  'Other'
];

const dryingTypes = [
  'Solar Drying (Sun)',
  'Artificial Drying (Oven)',
  'Mixed Drying',
  'Greenhouse Drying',
  'Marquesina Drying',
  'Traditional Mat Drying',
  'Other'
];

const chocolateTypes = ['Dark', 'Milk', 'White', 'Ruby', 'Blend'];
const temperingMethods = ['Manual', 'Machine', 'Untempered'];
const chocolateSweetenerOptions = ['Cane Sugar', 'Panela', 'Stevia', 'Honey', 'Other'];
const chocolateLecithinOptions = ['Soy', 'Sunflower', 'None'];
const chocolateFlavorOptions = ['Vanilla', 'Cinnamon', 'None', 'Other'];
const chocolateAllergenOptions = ['Gluten', 'Lactose', 'Nuts', 'Soy', 'None'];
const commonCertifications = ['Organic', 'Fairtrade', 'Direct Trade', 'Rainforest Alliance', 'None', 'Other'];

const buildCategoryId = (group: string, label: string) =>
  `${group}-${label}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const competitionCategories = {
  dark: [
    '≤ 60% cocoa',
    '61-75% cocoa',
    '≥ 76% cocoa',
    'With inclusions (salt, spices, nuts)'
  ],
  other: [
    'Milk Chocolate',
    'White Chocolate',
    'Single Origin Chocolate (Single Estate)',
    'Ruby Chocolate (naturally pink)',
    'No Added Sugar Chocolate',
    'Bars with Innovative Ingredients (e.g., superfoods, local ingredients)',
    'Colombian drinking chocolate'
  ]
} as const;

const SampleSubmission = () => {
  const { t } = useTranslation();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [submission, setSubmission] = useState<SampleSubmission>({
    contestId: '',
    contestName: '',
    productType: 'bean',

    // Bean basic
    lotNumber: '',
    harvestDate: '',

    // Origin
    country: '',
    department: '',
    municipality: '',
    district: '',
    farmName: '',
    cocoaAreaHectares: 0,

    // Owner
    ownerFullName: '',
    identificationDocument: '',
    phoneNumber: '',
    email: '',
    homeAddress: '',
    belongsToCooperative: false,
    cooperativeName: '',

    // Bean sample info
    quantity: 3,
    geneticMaterial: '',
    cropAge: 0,
    sampleSourceHectares: 0,
    moistureContent: 0,
    fermentationPercentage: 0,
    growingAltitudeMasl: 0,

    // Bean processing
    fermenterType: '',
    fermentationTime: 0,
    dryingType: '',
    dryingTime: 0,

    beanCertifications: {
      organic: false,
      fairtrade: false,
      directTrade: false,
      none: false,
      other: false,
      otherText: ''
    },

    variety: '',

    // Chocolate defaults
    chocolateName: '',
    chocolateBrand: '',
    chocolateBatch: '',
    chocolateProductionDate: '',
    chocolateManufacturerCountry: '',
    chocolateCocoaOriginCountry: '',
    chocolateRegion: '',
    chocolateMunicipality: '',
    chocolateFarmName: '',
    chocolateCocoaVariety: '',
    chocolateFermentationMethod: '',
    chocolateDryingMethod: '',
    chocolateType: '',
    chocolateCocoaPercentage: 0,
    chocolateCocoaButterPercentage: 0,
    chocolateSweeteners: [],
    chocolateSweetenerOther: '',
    chocolateLecithin: [],
    chocolateNaturalFlavors: [],
    chocolateNaturalFlavorsOther: '',
    chocolateAllergens: [],
    chocolateCertifications: [],
    chocolateCertificationsOther: '',
    conchingTimeHours: 0,
    conchingTemperatureCelsius: 0,
    temperingMethod: '',
    finalGranulationMicrons: 0,
    competitionCategory: '',

    // Liquor defaults
    liquorName: '',
    liquorBrand: '',
    liquorBatch: '',
    liquorProcessingDate: '',
    liquorCountryProcessing: '',
    lecithinPercentage: 0,
    liquorCocoaButterPercentage: 0,
    grindingTemperatureCelsius: 0,
    grindingTimeHours: 0,
    liquorProcessingMethod: '',
    liquorCocoaOriginCountry: '',
    liquorCocoaVariety: '',

    agreedToTerms: false
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Load available contests on component mount
  useEffect(() => {
    const loadContests = async () => {
      try {
        setLoading(true);
        const availableContests = await SampleSubmissionService.getAvailableContests();
        setContests(availableContests);
      } catch (error) {
        console.error('Error loading contests:', error);
        toast({
          title: 'Error loading contests',
          description: 'Please try again later.',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContests();
  }, [toast]);

  const handleContestSelect = (contest: Contest) => {
    setSelectedContest(contest);
    setSubmission(prev => ({
      ...prev,
      contestId: contest.id,
      contestName: contest.name
    }));
    // Do not auto-advance; require explicit Continue
  };

  const buildSubmissionData = (): SampleSubmissionData | null => {
    if (!submission.contestId) return null;

    const base: any = {
      contestId: submission.contestId,
      productType: submission.productType,
      agreedToTerms: submission.agreedToTerms,
    };

    if (submission.productType === 'bean') {
      return {
        ...base,
        // bean origin
        country: submission.country,
        department: submission.department || undefined,
        municipality: submission.municipality || undefined,
        district: submission.district || undefined,
        farmName: submission.farmName,
        cocoaAreaHectares: submission.cocoaAreaHectares || undefined,
        // bean owner
        ownerFullName: submission.ownerFullName,
        identificationDocument: submission.identificationDocument || undefined,
        phoneNumber: submission.phoneNumber || undefined,
        email: submission.email || undefined,
        homeAddress: submission.homeAddress || undefined,
        belongsToCooperative: submission.belongsToCooperative,
        cooperativeName: submission.cooperativeName || undefined,
        // bean info
        quantity: submission.quantity,
        geneticMaterial: submission.geneticMaterial || undefined,
        cropAge: submission.cropAge || undefined,
        sampleSourceHectares: submission.sampleSourceHectares || undefined,
        moistureContent: submission.moistureContent || undefined,
        fermentationPercentage: submission.fermentationPercentage || undefined,
        // bean processing
        fermenterType: submission.fermenterType || undefined,
        fermentationTime: submission.fermentationTime || undefined,
        dryingType: submission.dryingType || undefined,
        dryingTime: submission.dryingTime || undefined,
        // additional
        variety: submission.variety || undefined,
        // new bean specifics
        lotNumber: submission.lotNumber,
        harvestDate: submission.harvestDate || undefined,
        growingAltitudeMasl: submission.growingAltitudeMasl || undefined,
        beanCertifications: {
          organic: submission.beanCertifications.organic,
          fairtrade: submission.beanCertifications.fairtrade,
          directTrade: submission.beanCertifications.directTrade,
          none: submission.beanCertifications.none,
          other: submission.beanCertifications.other,
          otherText: submission.beanCertifications.otherText || undefined,
        },
      } as SampleSubmissionData;
    }

    if (submission.productType === 'chocolate') {
      return {
        ...base,
        chocolate: {
          name: submission.chocolateName,
          brand: submission.chocolateBrand,
          batch: submission.chocolateBatch,
          productionDate: submission.chocolateProductionDate || undefined,
          manufacturerCountry: submission.chocolateManufacturerCountry,
          cocoaOriginCountry: submission.chocolateCocoaOriginCountry,
          region: submission.chocolateRegion || undefined,
          municipality: submission.chocolateMunicipality || undefined,
          farmName: submission.chocolateFarmName || undefined,
          cocoaVariety: submission.chocolateCocoaVariety,
          fermentationMethod: submission.chocolateFermentationMethod,
          dryingMethod: submission.chocolateDryingMethod,
          type: submission.chocolateType,
          cocoaPercentage: submission.chocolateCocoaPercentage,
          cocoaButterPercentage: submission.chocolateCocoaButterPercentage || undefined,
          sweeteners: submission.chocolateSweeteners,
          sweetenerOther: submission.chocolateSweetenerOther || undefined,
          lecithin: submission.chocolateLecithin,
          naturalFlavors: submission.chocolateNaturalFlavors,
          naturalFlavorsOther: submission.chocolateNaturalFlavorsOther || undefined,
          allergens: submission.chocolateAllergens,
          certifications: submission.chocolateCertifications,
          certificationsOther: submission.chocolateCertificationsOther || undefined,
          conchingTimeHours: submission.conchingTimeHours || undefined,
          conchingTemperatureCelsius: submission.conchingTemperatureCelsius || undefined,
          temperingMethod: submission.temperingMethod,
          finalGranulationMicrons: submission.finalGranulationMicrons || undefined,
          competitionCategory: submission.competitionCategory || undefined,
        }
      } as SampleSubmissionData;
    }

    // liquor
    return {
      ...base,
      lotNumber: submission.lotNumber,
      harvestDate: submission.harvestDate || undefined,
      liquor: {
        name: submission.liquorName,
        brand: submission.liquorBrand,
        batch: submission.liquorBatch,
        processingDate: submission.liquorProcessingDate || undefined,
        countryProcessing: submission.liquorCountryProcessing,
        lecithinPercentage: submission.lecithinPercentage,
        cocoaButterPercentage: submission.liquorCocoaButterPercentage || undefined,
        grindingTemperatureCelsius: submission.grindingTemperatureCelsius || undefined,
        grindingTimeHours: submission.grindingTimeHours || undefined,
        processingMethod: submission.liquorProcessingMethod,
        cocoaOriginCountry: submission.liquorCocoaOriginCountry,
        cocoaVariety: submission.liquorCocoaVariety || undefined,
      }
    } as SampleSubmissionData;
  };

  const handleSubmit = async (): Promise<Sample | undefined> => {
    if (!selectedContest || !submission.agreedToTerms) {
      toast({
        title: 'Cannot submit',
        description: 'Please select a contest and agree to the terms.',
        variant: "destructive"
      });
      return undefined;
    }

    const submissionData = buildSubmissionData();
    if (!submissionData) {
      toast({ title: 'Invalid form', description: 'Please complete required fields.', variant: 'destructive' });
      return undefined;
    }

    setIsSubmitting(true);

    try {
      const submittedSample = await SamplesService.submitSample(submissionData);
      toast({
        title: 'Sample submitted',
        description: `Tracking code: ${submittedSample.tracking_code}`,
      });

      setSubmission(prev => ({
        ...prev,
        id: submittedSample.id,
        trackingCode: submittedSample.tracking_code,
        qrCodeUrl: submittedSample.qr_code_url
      }));

      setCurrentStep(7); // Success step (after adding product type step)
      return submittedSample;
    } catch (error) {
      console.error('Error submitting sample:', error);
      toast({ title: 'Submission failed', description: 'Please try again later.', variant: 'destructive' });
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: 'Product Type' },
      { number: 2, title: 'Contest' },
      { number: 3, title: 'Origin & Owner' },
      { number: 4, title: 'Detail & Submit' }
    ];

    return (
      <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-6 sm:mb-8 overflow-x-auto px-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentStep >= step.number
                  ? 'bg-[hsl(var(--chocolate-medium))] text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.number}
              </div>
              <span className="text-xs mt-1 text-center max-w-16 sm:max-w-none truncate">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-6 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                currentStep > step.number ? 'bg-[hsl(var(--chocolate-medium))]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Terms & submit block reused for all product types
  const TermsAndSubmit = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Agree & Submit</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Confirm and finalize your submission</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox id="agree" checked={submission.agreedToTerms} onCheckedChange={(c)=> setSubmission(p=>({...p, agreedToTerms: !!c}))} />
          <Label htmlFor="agree" className="text-xs sm:text-sm">I agree to the contest terms and conditions *</Label>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting || !submission.agreedToTerms} className="w-full sm:w-auto bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))]">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Sample
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // UI RENDERING
  if (currentStep === 7) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">Submission Successful</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Your submission has been recorded.</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-4">All set!</h3>

            <div className="space-y-4 text-left">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Details</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="break-words">Contest: {selectedContest?.name}</div>
                  <div className="break-words">Owner: {submission.ownerFullName}</div>
                  <div className="break-words">Farm: {submission.farmName}</div>
                  <div className="font-mono font-semibold text-blue-600 break-all">Tracking Code: {submission.trackingCode}</div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Next steps</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div>Your sample has been registered.</div>
                  <div>A QR code has been generated.</div>
                  <div>Package your product as required.</div>
                  <div>Attach the QR code to the package.</div>
                  <div>Ship to the indicated address.</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button
                className="px-6 sm:px-8"
                onClick={() => {
                  if (submission.qrCodeUrl) {
                    window.open(submission.qrCodeUrl, '_blank');
                  } else {
                    toast({ title: 'QR not available', description: 'Please try again later.', variant: 'destructive' });
                  }
                }}
                disabled={!submission.qrCodeUrl}
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span className="text-xs sm:text-sm">Download QR</span>
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setCurrentStep(1);
                setSelectedContest(null);
                setSubmission({
                  ...submission,
                  id: undefined,
                  trackingCode: undefined,
                  qrCodeUrl: undefined,
                  contestId: '',
                  contestName: '',
                  agreedToTerms: false,
                });
              }}
            >
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">Sample Submission</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Submit your product for the competition</p>
      </div>

      {renderStepIndicator()}

      {/* Step 1: Product Type Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">1. Product Type</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select the product you are submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'bean', label: 'Cocoa Bean' },
                  { key: 'liquor', label: 'Cocoa Liquor/Mass' },
                  { key: 'chocolate', label: 'Chocolate' },
                ].map(pt => (
                  <div
                    key={pt.key}
                    className={`p-4 border rounded-lg cursor-pointer ${submission.productType === pt.key ? 'border-[hsl(var(--chocolate-medium))] shadow-[var(--shadow-chocolate)]' : ''}`}
                    onClick={() => setSubmission(prev => ({ ...prev, productType: pt.key as ProductType }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{pt.label}</div>
                      {submission.productType === pt.key && <Badge variant="default" className="text-xs">Selected</Badge>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" disabled className="w-full sm:w-auto">Back</Button>
                <Button onClick={() => setCurrentStep(2)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Contest Selection */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">2. Contest Selection</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Choose an open contest</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col sm:flex-row justify-center items-center py-8 sm:py-12 gap-3 sm:gap-2">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[hsl(var(--chocolate-medium))]" />
                  <span className="text-sm sm:text-base text-muted-foreground">Loading contests...</span>
                </div>
              ) : contests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No contests available</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Please check back later.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {contests.filter(c => c.status === 'open').map((contest) => {
                    const isSelected = selectedContest?.id === contest.id;
                    return (
                      <div
                        key={contest.id}
                        className={`p-4 sm:p-6 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer ${isSelected ? 'border-[hsl(var(--chocolate-medium))] shadow-[var(--shadow-chocolate)]' : ''}`}
                        onClick={() => handleContestSelect(contest)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                              <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--chocolate-dark))]">{contest.name}</h3>
                              <Badge variant="default" className="text-xs w-fit">Open</Badge>
                              {isSelected && <Badge variant="secondary" className="text-xs">Selected</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-4">{contest.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm">Registration: {contest.registrationDeadline}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm">Submission: {contest.submissionDeadline}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-xs sm:text-sm">Categories</h4>
                              <div className="flex flex-wrap gap-2">
                                {contest.categories.map((category) => (
                                  <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">Back</Button>
                <Button onClick={() => setCurrentStep(3)} disabled={!selectedContest} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Origin & Owner */}
      {currentStep === 3 && selectedContest && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">3. Origin & Owner (Cocoa Liquor/Mass)</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Provide origin details and owner information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Contest information */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Contest</h4>
                <p className="text-blue-800 text-xs sm:text-sm break-words">{selectedContest.name}</p>
              </div>

              {/* Origin Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">Origin Data</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="country" className="text-xs sm:text-sm">Country *</Label>
                    <Input id="country" value={submission.country} onChange={(e) => setSubmission(prev => ({ ...prev, country: e.target.value }))} placeholder="e.g., Colombia" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs sm:text-sm">Department</Label>
                    <Input id="department" value={submission.department} onChange={(e) => setSubmission(prev => ({ ...prev, department: e.target.value }))} placeholder="e.g., Arauca" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="municipality" className="text-xs sm:text-sm">Municipality</Label>
                    <Input id="municipality" value={submission.municipality} onChange={(e) => setSubmission(prev => ({ ...prev, municipality: e.target.value }))} placeholder="e.g., Arauca" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="district" className="text-xs sm:text-sm">District</Label>
                    <Input id="district" value={submission.district} onChange={(e) => setSubmission(prev => ({ ...prev, district: e.target.value }))} placeholder="e.g., La Pica" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="farmName" className="text-xs sm:text-sm">Farm Name *</Label>
                    <Input id="farmName" value={submission.farmName} onChange={(e) => setSubmission(prev => ({ ...prev, farmName: e.target.value }))} placeholder="e.g., La Pica" className="text-xs sm:text-sm" />
                  </div>
                </div>
              </div>

              {/* Owner Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">Owner Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="ownerFullName" className="text-xs sm:text-sm">Owner Full Name *</Label>
                    <Input id="ownerFullName" value={submission.ownerFullName} onChange={(e) => setSubmission(prev => ({ ...prev, ownerFullName: e.target.value }))} placeholder="e.g., Jane Doe" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="identificationDocument" className="text-xs sm:text-sm">Identify Number</Label>
                    <Input id="identificationDocument" value={submission.identificationDocument} onChange={(e) => setSubmission(prev => ({ ...prev, identificationDocument: e.target.value }))} placeholder="e.g., 123456789" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-xs sm:text-sm">Phone</Label>
                    <Input id="phoneNumber" value={submission.phoneNumber} onChange={(e) => setSubmission(prev => ({ ...prev, phoneNumber: e.target.value }))} placeholder="e.g., +57 300 000 0000" className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                    <Input id="email" type="email" value={submission.email} onChange={(e) => setSubmission(prev => ({ ...prev, email: e.target.value }))} placeholder="e.g., jane@example.com" className="text-xs sm:text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="homeAddress" className="text-xs sm:text-sm">Home Address</Label>
                    <Input id="homeAddress" value={submission.homeAddress} onChange={(e) => setSubmission(prev => ({ ...prev, homeAddress: e.target.value }))} placeholder="Address" className="text-xs sm:text-sm" />
                  </div>
                  <div className="flex items-center space-x-2 sm:col-span-2">
                    <Checkbox id="belongsToCooperative" checked={submission.belongsToCooperative} onCheckedChange={(checked) => setSubmission(prev => ({ ...prev, belongsToCooperative: !!checked }))} />
                    <Label htmlFor="belongsToCooperative" className="text-xs sm:text-sm">Belongs to a cooperative</Label>
                  </div>
                  {submission.belongsToCooperative && (
                    <div className="sm:col-span-2">
                      <Label htmlFor="cooperativeName" className="text-xs sm:text-sm">Cooperative Name</Label>
                      <Input id="cooperativeName" value={submission.cooperativeName} onChange={(e) => setSubmission(prev => ({ ...prev, cooperativeName: e.target.value }))} placeholder="e.g., ACME Coop" className="text-xs sm:text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">Back</Button>
                <Button onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">Continue</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Detail & Submit */}
      {currentStep === 4 && selectedContest && (
        <div className="space-y-6">
          {/* Bean-specific processing and additional fields */}
          {submission.productType === 'bean' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">4. Detail & Submit (Bean)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Complete technical details and submit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bean Basic */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Bean Basic</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Lot number or name *</Label>
                      <Input value={submission.lotNumber} onChange={(e)=>setSubmission(p=>({...p, lotNumber:e.target.value}))} />
                    </div>
                    <div>
                      <Label>Harvest date *</Label>
                      <Input type="date" value={submission.harvestDate} onChange={(e)=>setSubmission(p=>({...p, harvestDate:e.target.value}))} />
                    </div>
                    <div>
                      <Label>Growing altitude (m.a.s.l.)</Label>
                      <Input type="number" min="0" value={submission.growingAltitudeMasl} onChange={(e)=>setSubmission(p=>({...p, growingAltitudeMasl: parseInt(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Variety</Label>
                      <Input value={submission.variety} onChange={(e)=>setSubmission(p=>({...p, variety:e.target.value}))} />
                    </div>
                  </div>
                </div>

                {/* Sample Information */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Sample Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity (kg)</Label>
                      <Input type="number" min="0" step="0.1" value={submission.quantity} onChange={(e)=>setSubmission(p=>({...p, quantity: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Genetic Material</Label>
                      <Select value={submission.geneticMaterial} onValueChange={(v)=>setSubmission(p=>({...p, geneticMaterial:v}))}>
                        <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                        <SelectContent>
                          {geneticMaterials.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Crop Age (years)</Label>
                      <Input type="number" min="0" value={submission.cropAge} onChange={(e)=>setSubmission(p=>({...p, cropAge: parseInt(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Sample Source Area (ha)</Label>
                      <Input type="number" min="0" step="0.01" value={submission.sampleSourceHectares} onChange={(e)=>setSubmission(p=>({...p, sampleSourceHectares: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Moisture Content (%)</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={submission.moistureContent} onChange={(e)=>setSubmission(p=>({...p, moistureContent: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Fermentation (%)</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={submission.fermentationPercentage} onChange={(e)=>setSubmission(p=>({...p, fermentationPercentage: parseFloat(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>

                {/* Processing */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Processing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Fermenter Type</Label>
                      <Select value={submission.fermenterType} onValueChange={(v)=>setSubmission(p=>({...p, fermenterType:v}))}>
                        <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                        <SelectContent>
                          {fermenterTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fermentation Time (hours)</Label>
                      <Input type="number" min="0" value={submission.fermentationTime} onChange={(e)=>setSubmission(p=>({...p, fermentationTime: parseInt(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Drying Type</Label>
                      <Select value={submission.dryingType} onValueChange={(v)=>setSubmission(p=>({...p, dryingType:v}))}>
                        <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                        <SelectContent>
                          {dryingTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Drying Time (hours)</Label>
                      <Input type="number" min="0" value={submission.dryingTime} onChange={(e)=>setSubmission(p=>({...p, dryingTime: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Certifications</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-org" checked={submission.beanCertifications.organic} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, organic: !!c}}))} />
                      <Label htmlFor="cert-org">Organic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-ft" checked={submission.beanCertifications.fairtrade} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, fairtrade: !!c}}))} />
                      <Label htmlFor="cert-ft">Fairtrade</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-dt" checked={submission.beanCertifications.directTrade} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, directTrade: !!c}}))} />
                      <Label htmlFor="cert-dt">Direct Trade</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-none" checked={submission.beanCertifications.none} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, none: !!c}}))} />
                      <Label htmlFor="cert-none">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-other" checked={submission.beanCertifications.other} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, other: !!c}}))} />
                      <Label htmlFor="cert-other">Other</Label>
                    </div>
                    {submission.beanCertifications.other && (
                      <div className="sm:col-span-2">
                        <Input placeholder="Other certification" value={submission.beanCertifications.otherText} onChange={(e)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, otherText: e.target.value}}))} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">Back</Button>
                <Button disabled onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">Continue</Button>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Chocolate-specific processing and additional fields */}
          {submission.productType === 'chocolate' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">4. Chocolate Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Provide product information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 1 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">Section 1: Basic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Chocolate Name *</Label>
                    <Input value={submission.chocolateName} onChange={(e)=>setSubmission(p=>({...p,chocolateName:e.target.value}))} placeholder="Dark Mountain 70%" />
                  </div>
                  <div>
                    <Label>Brand/Manufacturer *</Label>
                    <Input value={submission.chocolateBrand} onChange={(e)=>setSubmission(p=>({...p,chocolateBrand:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Batch/Reference *</Label>
                    <Input value={submission.chocolateBatch} onChange={(e)=>setSubmission(p=>({...p,chocolateBatch:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Production Date *</Label>
                    <Input type="date" value={submission.chocolateProductionDate} onChange={(e)=>setSubmission(p=>({...p,chocolateProductionDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Manufacturer's Country *</Label>
                    <Input value={submission.chocolateManufacturerCountry} onChange={(e)=>setSubmission(p=>({...p,chocolateManufacturerCountry:e.target.value}))} placeholder="Country" />
                  </div>
                  <div>
                    <Label>Cocoa Country of Origin *</Label>
                    <Input value={submission.chocolateCocoaOriginCountry} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaOriginCountry:e.target.value}))} placeholder="Country" />
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">Section 2: Origin of Raw Material</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Region/Department</Label>
                    <Input value={submission.chocolateRegion} onChange={(e)=>setSubmission(p=>({...p,chocolateRegion:e.target.value}))} placeholder="e.g., Arauca" />
                  </div>
                  <div>
                    <Label>Municipality</Label>
                    <Input value={submission.chocolateMunicipality} onChange={(e)=>setSubmission(p=>({...p,chocolateMunicipality:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Farm Name</Label>
                    <Input value={submission.chocolateFarmName} onChange={(e)=>setSubmission(p=>({...p,chocolateFarmName:e.target.value}))} placeholder="La Pica" />
                  </div>
                  <div>
                    <Label>Cocoa Variety *</Label>
                    <Input value={submission.chocolateCocoaVariety} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaVariety:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Fermentation Method</Label>
                    <Select value={submission.chocolateFermentationMethod} onValueChange={(v)=>setSubmission(p=>({...p,chocolateFermentationMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                      <SelectContent>
                        {['Wooden Crates','Baskets','Leaves','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Drying Method</Label>
                    <Select value={submission.chocolateDryingMethod} onValueChange={(v)=>setSubmission(p=>({...p,chocolateDryingMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                      <SelectContent>
                        {['Solar','Dryer','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">Section 3: Composition & Technical</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Chocolate Type *</Label>
                    <Select value={submission.chocolateType} onValueChange={(v)=>setSubmission(p=>({...p,chocolateType:v}))}>
                      <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                      <SelectContent>
                        {chocolateTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cocoa Percentage (%) *</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.chocolateCocoaPercentage} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>Cocoa Butter Percentage (%)</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.chocolateCocoaButterPercentage} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaButterPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Main Ingredients - Sweetener *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {chocolateSweetenerOptions.map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sweet-${opt}`}
                            checked={submission.chocolateSweeteners.includes(opt)}
                            onCheckedChange={(c)=>{
                              setSubmission(p=>{
                                const arr = new Set(p.chocolateSweeteners);
                                if (c) arr.add(opt); else arr.delete(opt);
                                return { ...p, chocolateSweeteners: Array.from(arr)};
                              });
                            }}
                          />
                          <Label htmlFor={`sweet-${opt}`} className="text-xs">{opt}</Label>
                        </div>
                      ))}
                    </div>
                    {submission.chocolateSweeteners.includes('Other') && (
                      <Input className="mt-2" placeholder="Other sweetener" value={submission.chocolateSweetenerOther} onChange={(e)=>setSubmission(p=>({...p,chocolateSweetenerOther:e.target.value}))} />
                    )}
                  </div>
                  <div>
                    <Label>Main Ingredients - Lecithin *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {chocolateLecithinOptions.map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`lec-${opt}`}
                            checked={submission.chocolateLecithin.includes(opt)}
                            onCheckedChange={(c)=>{
                              setSubmission(p=>{
                                const arr = new Set(p.chocolateLecithin);
                                if (c) arr.add(opt); else arr.delete(opt);
                                return { ...p, chocolateLecithin: Array.from(arr)};
                              });
                            }}
                          />
                          <Label htmlFor={`lec-${opt}`} className="text-xs">{opt}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Natural Flavors</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {chocolateFlavorOptions.map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`flv-${opt}`}
                            checked={submission.chocolateNaturalFlavors.includes(opt)}
                            onCheckedChange={(c)=>{
                              setSubmission(p=>{
                                const arr = new Set(p.chocolateNaturalFlavors);
                                if (c) arr.add(opt); else arr.delete(opt);
                                return { ...p, chocolateNaturalFlavors: Array.from(arr)};
                              });
                            }}
                          />
                          <Label htmlFor={`flv-${opt}`} className="text-xs">{opt}</Label>
                        </div>
                      ))}
                    </div>
                    {submission.chocolateNaturalFlavors.includes('Other') && (
                      <Input className="mt-2" placeholder="Other flavor" value={submission.chocolateNaturalFlavorsOther} onChange={(e)=>setSubmission(p=>({...p,chocolateNaturalFlavorsOther:e.target.value}))} />
                    )}
                  </div>
                  <div>
                    <Label>Allergens Present</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {chocolateAllergenOptions.map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`alg-${opt}`}
                            checked={submission.chocolateAllergens.includes(opt)}
                            onCheckedChange={(c)=>{
                              setSubmission(p=>{
                                const arr = new Set(p.chocolateAllergens);
                                if (c) arr.add(opt); else arr.delete(opt);
                                return { ...p, chocolateAllergens: Array.from(arr)};
                              });
                            }}
                          />
                          <Label htmlFor={`alg-${opt}`} className="text-xs">{opt}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Certifications</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commonCertifications.map(opt => (
                      <div key={opt} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cert-${opt}`}
                          checked={submission.chocolateCertifications.includes(opt)}
                          onCheckedChange={(c)=>{
                            setSubmission(p=>{
                              const arr = new Set(p.chocolateCertifications);
                              if (c) arr.add(opt); else arr.delete(opt);
                              return { ...p, chocolateCertifications: Array.from(arr)};
                            });
                          }}
                        />
                        <Label htmlFor={`cert-${opt}`} className="text-xs">{opt}</Label>
                      </div>
                    ))}
                  </div>
                  {submission.chocolateCertifications.includes('Other') && (
                    <Input className="mt-2" placeholder="Other certification" value={submission.chocolateCertificationsOther} onChange={(e)=>setSubmission(p=>({...p,chocolateCertificationsOther:e.target.value}))} />
                  )}
                </div>
                {/* Section 4 */}
                <div className="mt-4">
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Section 4: Chocolate Processing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Conching Time (hours)</Label>
                      <Input type="number" min="0" step="0.1" value={submission.conchingTimeHours} onChange={(e)=>setSubmission(p=>({...p,conchingTimeHours: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Conching Temperature (°C)</Label>
                      <Input type="number" min="0" step="0.1" value={submission.conchingTemperatureCelsius} onChange={(e)=>setSubmission(p=>({...p,conchingTemperatureCelsius: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>Tempering Method</Label>
                      <Select value={submission.temperingMethod} onValueChange={(v)=>setSubmission(p=>({...p,temperingMethod:v}))}>
                        <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                        <SelectContent>
                          {temperingMethods.map(method=> <SelectItem key={method} value={method}>{method}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Final Granulation (microns)</Label>
                      <Input type="number" min="0" value={submission.finalGranulationMicrons} onChange={(e)=>setSubmission(p=>({...p,finalGranulationMicrons: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>
                {/* Section 5 */}
                <div className="mt-4">
                  <h4 className="font-medium mb-3 text-sm sm:text-base">Section 5: Competition Category (Single Selection)</h4>
                  <RadioGroup
                    value={submission.competitionCategory}
                    onValueChange={(value)=>setSubmission(prev=>({...prev, competitionCategory: value}))}
                    className="space-y-4"
                  >
                    <div>
                      <Label className="text-sm font-semibold uppercase text-muted-foreground">Dark Chocolate</Label>
                      <div className="mt-2 space-y-2">
                        {competitionCategories.dark.map((category)=> {
                          const itemId = buildCategoryId('dark', category);
                          return (
                            <div key={category} className="flex items-center space-x-2">
                              <RadioGroupItem id={itemId} value={`Dark: ${category}`} className="h-4 w-4" />
                              <Label htmlFor={itemId} className="font-normal">{category}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold uppercase text-muted-foreground">Other Categories</Label>
                      <div className="mt-2 space-y-2">
                        {competitionCategories.other.map((category)=> {
                          const itemId = buildCategoryId('other', category);
                          return (
                            <div key={category} className="flex items-center space-x-2">
                              <RadioGroupItem id={itemId} value={category} className="h-4 w-4" />
                              <Label htmlFor={itemId} className="font-normal">{category}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">Back</Button>
                <Button disabled onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">Continue</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Liquor-specific processing and additional fields */}
          {submission.productType === 'liquor' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">4. Cocoa Liquor/Mass Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Provide product information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 1 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">Section 1: Basic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Lot number or name *</Label>
                    <Input value={submission.lotNumber} onChange={(e)=>setSubmission(p=>({...p, lotNumber:e.target.value}))} placeholder="Arauca Harvest 2024" />
                  </div>
                  <div>
                    <Label>Harvest date *</Label>
                    <Input type="date" value={submission.harvestDate} onChange={(e)=>setSubmission(p=>({...p, harvestDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Liquor Name *</Label>
                    <Input value={submission.liquorName} onChange={(e)=>setSubmission(p=>({...p, liquorName:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Brand/Processor *</Label>
                    <Input value={submission.liquorBrand} onChange={(e)=>setSubmission(p=>({...p, liquorBrand:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Batch/Reference *</Label>
                    <Input value={submission.liquorBatch} onChange={(e)=>setSubmission(p=>({...p, liquorBatch:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Processing Date *</Label>
                    <Input type="date" value={submission.liquorProcessingDate} onChange={(e)=>setSubmission(p=>({...p, liquorProcessingDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Country of Processing *</Label>
                    <Input value={submission.liquorCountryProcessing} onChange={(e)=>setSubmission(p=>({...p, liquorCountryProcessing:e.target.value}))} />
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">Section 2: Technical Characteristics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Lecithin Percentage (%) *</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.lecithinPercentage} onChange={(e)=>setSubmission(p=>({...p, lecithinPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>Cocoa Butter Percentage (%) *</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.liquorCocoaButterPercentage} onChange={(e)=>setSubmission(p=>({...p, liquorCocoaButterPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>Grinding Temperature (°C)</Label>
                    <Input type="number" step="0.1" value={submission.grindingTemperatureCelsius} onChange={(e)=>setSubmission(p=>({...p, grindingTemperatureCelsius: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>Grinding Time (hours)</Label>
                    <Input type="number" min="0" value={submission.grindingTimeHours} onChange={(e)=>setSubmission(p=>({...p, grindingTimeHours: parseInt(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>Processing Method *</Label>
                    <Select value={submission.liquorProcessingMethod} onValueChange={(v)=>setSubmission(p=>({...p, liquorProcessingMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                      <SelectContent>
                        {['Artisanal','Industrial','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cocoa Origin Country *</Label>
                    <Input value={submission.liquorCocoaOriginCountry} onChange={(e)=>setSubmission(p=>({...p, liquorCocoaOriginCountry:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Cocoa Variety</Label>
                    <Input value={submission.liquorCocoaVariety} onChange={(e)=>setSubmission(p=>({...p, liquorCocoaVariety:e.target.value}))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">Back</Button>
                <Button disabled onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">Continue</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Terms & Submit for all */}
          <TermsAndSubmit />
        </div>
      )}
    </div>
  );
};

export default SampleSubmission;