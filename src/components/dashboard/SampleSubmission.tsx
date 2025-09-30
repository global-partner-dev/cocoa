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
  Loader2,
  Upload,
  FileText,
  X,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SampleSubmissionService, type SampleSubmissionContest } from "@/lib/sampleSubmissionService";
import { SamplesService, type SampleSubmissionData } from "@/lib/samplesService";
import type { Sample } from "@/lib/samplesService";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

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
  additionalSampleDescription?: string;

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
  withInclusions: boolean;

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

  // Attached Documentation
  attachedDocuments: File[];

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

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const buildCategoryId = (group: string, label: string) =>
  `${group}-${label}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const competitionCategories = {
  dark: [
    '≤ 60% cocoa',
    '61-75% cocoa',
    '≥ 76% cocoa'
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

interface SampleSubmissionProps {
  draftId?: string; // Optional draft ID to load on mount
}

const SampleSubmission = ({ draftId }: SampleSubmissionProps = {}) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlDraftId = searchParams.get('draftId');
  const effectiveDraftId = draftId || urlDraftId;
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  // Define initial state as a constant to reuse for resets
  const initialSubmissionState: SampleSubmission = {
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
    additionalSampleDescription: '',

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
    withInclusions: false,

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

    // Attached Documentation
    attachedDocuments: [],

    agreedToTerms: false
  };

  const [submission, setSubmission] = useState<SampleSubmission>(initialSubmissionState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Function to reset form to initial state
  const resetForm = () => {
    setSubmission(initialSubmissionState);
    setCurrentStep(1);
    setSelectedContest(null);
  };

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
          title: t('pages.sampleSubmission.toasts.errorLoadingContests'),
          description: t('pages.sampleSubmission.toasts.tryAgainLater'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContests();
  }, [toast]);

  // Load draft if draftId is provided
  useEffect(() => {
    if (effectiveDraftId && contests.length > 0) {
      loadDraftFromDatabase(effectiveDraftId);
    }
  }, [effectiveDraftId, contests]);

  // File upload helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: t('pages.sampleSubmission.toasts.invalidFileType'),
          description: t('pages.sampleSubmission.toasts.uploadPdfJpgPng'),
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          title: t('pages.sampleSubmission.toasts.fileTooLarge'),
          description: t('pages.sampleSubmission.toasts.uploadSmallerFiles'),
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setSubmission(prev => ({
      ...prev,
      attachedDocuments: [...prev.attachedDocuments, ...validFiles]
    }));
    
    if (validFiles.length > 0) {
      toast({
        title: t('pages.sampleSubmission.toasts.documentsUploaded'),
        description: t('pages.sampleSubmission.toasts.documentsUploadedSuccess', { count: validFiles.length }),
      });
    }
  };

  const removeDocument = (index: number) => {
    setSubmission(prev => ({
      ...prev,
      attachedDocuments: prev.attachedDocuments.filter((_, i) => i !== index)
    }));
    toast({
      title: t('pages.sampleSubmission.toasts.documentRemoved'),
      description: t('pages.sampleSubmission.toasts.documentRemovedDesc'),
    });
  };

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
      additionalSampleDescription: submission.additionalSampleDescription || undefined,
      attachedDocuments: submission.attachedDocuments.length > 0 ? submission.attachedDocuments : undefined,
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
          withInclusions: submission.withInclusions,
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
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      toast({
        title: t('pages.sampleSubmission.toasts.formValidationFailed'),
        description: validation.errors[0], // Show first error
        variant: "destructive"
      });
      return undefined;
    }

    const submissionData = buildSubmissionData();
    if (!submissionData) {
      toast({ 
        title: t('pages.sampleSubmission.toasts.invalidForm'), 
        description: t('pages.sampleSubmission.toasts.completeRequiredFields'), 
        variant: 'destructive' 
      });
      return undefined;
    }

    setIsSubmitting(true);

    try {
      let submittedSample: Sample;
      
      if (submission.id) {
        // If we have an existing draft, submit it
        submittedSample = await SamplesService.submitDraft(submission.id);
      } else {
        // Create new submission
        submittedSample = await SamplesService.submitSample(submissionData);
      }
      
      toast({
        title: t('pages.sampleSubmission.toasts.sampleSubmitted'),
        description: t('pages.sampleSubmission.toasts.trackingCodeLabel', { code: submittedSample.tracking_code }),
      });

      setSubmission(prev => ({
        ...prev,
        id: submittedSample.id,
        trackingCode: submittedSample.tracking_code,
        qrCodeUrl: submittedSample.qr_code_url
      }));

      setCurrentStep(7); // Success step (after adding product type step)
      clearDraft(); // Clear saved draft on successful submission
      return submittedSample;
    } catch (error) {
      console.error('Error submitting sample:', error);
      toast({ 
        title: t('pages.sampleSubmission.toasts.submissionFailed'), 
        description: t('pages.sampleSubmission.toasts.tryAgainLater'), 
        variant: 'destructive' 
      });
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsDraft = async () => {
    try {
      setIsSubmitting(true);
      
      const submissionData = buildSubmissionData();
      if (!submissionData) {
        toast({ 
          title: t('pages.sampleSubmission.toasts.cannotSaveDraft'), 
          description: t('pages.sampleSubmission.toasts.selectContestFirst'), 
          variant: 'destructive' 
        });
        return;
      }

      // Check if we're updating an existing draft or creating a new one
      if (submission.id) {
        // Update existing draft
        await SamplesService.updateDraft(submission.id, submissionData);
        toast({
          title: t('pages.sampleSubmission.toasts.draftUpdated'),
          description: t('pages.sampleSubmission.toasts.draftUpdatedDesc'),
        });
      } else {
        // Create new draft
        const draft = await SamplesService.saveDraft(submissionData);
        setSubmission(prev => ({ ...prev, id: draft.id }));
        toast({
          title: t('pages.sampleSubmission.toasts.draftSaved'),
          description: t('pages.sampleSubmission.toasts.draftSavedDesc'),
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: t('pages.sampleSubmission.toasts.errorSavingDraft'),
        description: error instanceof Error ? error.message : t('pages.sampleSubmission.toasts.unknownError'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load a specific draft from database
  const loadDraftFromDatabase = async (draftId: string) => {
    try {
      setLoading(true);
      const draft = await SamplesService.getSampleById(draftId);
      
      if (!draft || draft.status !== 'draft') {
        toast({
          title: t('pages.sampleSubmission.toasts.draftNotFound'),
          description: t('pages.sampleSubmission.toasts.draftNotFoundDesc'),
          variant: 'destructive'
        });
        return;
      }

      // Convert database draft to form state
      const draftSubmission: SampleSubmission = {
        id: draft.id,
        contestId: draft.contest_id,
        contestName: (draft as any).contests?.name || '',
        productType: draft.product_type || 'bean',
        
        // Common fields
        lotNumber: draft.lot_number || '',
        harvestDate: draft.harvest_date || '',
        
        // Bean fields
        country: draft.country || '',
        department: draft.department || '',
        municipality: draft.municipality || '',
        district: draft.district || '',
        farmName: draft.farm_name || '',
        cocoaAreaHectares: draft.cocoa_area_hectares || 0,
        ownerFullName: draft.owner_full_name || '',
        identificationDocument: draft.identification_document || '',
        phoneNumber: draft.phone_number || '',
        email: draft.email || '',
        homeAddress: draft.home_address || '',
        belongsToCooperative: draft.belongs_to_cooperative || false,
        cooperativeName: draft.cooperative_name || '',
        quantity: draft.quantity || 3,
        geneticMaterial: draft.genetic_material || '',
        cropAge: draft.crop_age || 0,
        sampleSourceHectares: draft.sample_source_hectares || 0,
        moistureContent: draft.moisture_content || 0,
        fermentationPercentage: draft.fermentation_percentage || 0,
        growingAltitudeMasl: draft.growing_altitude_masl || 0,
        fermenterType: draft.fermenter_type || '',
        fermentationTime: draft.fermentation_time || 0,
        dryingType: draft.drying_type || '',
        dryingTime: draft.drying_time || 0,
        variety: draft.variety || '',
        beanCertifications: draft.bean_certifications || {
          organic: false,
          fairtrade: false,
          directTrade: false,
          none: false,
          other: false,
          otherText: ''
        },
        
        // Chocolate fields (from JSON data)
        chocolateName: (draft as any).chocolate_data?.name || '',
        chocolateBrand: (draft as any).chocolate_data?.brand || '',
        chocolateBatch: (draft as any).chocolate_data?.batch || '',
        chocolateProductionDate: (draft as any).chocolate_data?.productionDate || '',
        chocolateManufacturerCountry: (draft as any).chocolate_data?.manufacturerCountry || '',
        chocolateCocoaOriginCountry: (draft as any).chocolate_data?.cocoaOriginCountry || '',
        chocolateRegion: (draft as any).chocolate_data?.region || '',
        chocolateMunicipality: (draft as any).chocolate_data?.municipality || '',
        chocolateFarmName: (draft as any).chocolate_data?.farmName || '',
        chocolateCocoaVariety: (draft as any).chocolate_data?.cocoaVariety || '',
        chocolateFermentationMethod: (draft as any).chocolate_data?.fermentationMethod || '',
        chocolateDryingMethod: (draft as any).chocolate_data?.dryingMethod || '',
        chocolateType: (draft as any).chocolate_data?.type || '',
        chocolateCocoaPercentage: (draft as any).chocolate_data?.cocoaPercentage || 0,
        chocolateCocoaButterPercentage: (draft as any).chocolate_data?.cocoaButterPercentage || 0,
        chocolateSweeteners: (draft as any).chocolate_data?.sweeteners || [],
        chocolateSweetenerOther: (draft as any).chocolate_data?.sweetenerOther || '',
        chocolateLecithin: (draft as any).chocolate_data?.lecithin || [],
        chocolateNaturalFlavors: (draft as any).chocolate_data?.naturalFlavors || [],
        chocolateNaturalFlavorsOther: (draft as any).chocolate_data?.naturalFlavorsOther || '',
        chocolateAllergens: (draft as any).chocolate_data?.allergens || [],
        chocolateCertifications: (draft as any).chocolate_data?.certifications || [],
        chocolateCertificationsOther: (draft as any).chocolate_data?.certificationsOther || '',
        conchingTimeHours: (draft as any).chocolate_data?.conchingTimeHours || 0,
        conchingTemperatureCelsius: (draft as any).chocolate_data?.conchingTemperatureCelsius || 0,
        temperingMethod: (draft as any).chocolate_data?.temperingMethod || '',
        finalGranulationMicrons: (draft as any).chocolate_data?.finalGranulationMicrons || 0,
        competitionCategory: (draft as any).chocolate_data?.competitionCategory || '',
        
        // Liquor fields (from JSON data)
        liquorName: (draft as any).liquor_data?.name || '',
        liquorBrand: (draft as any).liquor_data?.brand || '',
        liquorBatch: (draft as any).liquor_data?.batch || '',
        liquorProcessingDate: (draft as any).liquor_data?.processingDate || '',
        liquorCountryProcessing: (draft as any).liquor_data?.countryProcessing || '',
        lecithinPercentage: (draft as any).liquor_data?.lecithinPercentage || 0,
        liquorCocoaButterPercentage: (draft as any).liquor_data?.cocoaButterPercentage || 0,
        grindingTemperatureCelsius: (draft as any).liquor_data?.grindingTemperatureCelsius || 0,
        grindingTimeHours: (draft as any).liquor_data?.grindingTimeHours || 0,
        liquorProcessingMethod: (draft as any).liquor_data?.processingMethod || '',
        liquorCocoaOriginCountry: (draft as any).liquor_data?.cocoaOriginCountry || '',
        liquorCocoaVariety: (draft as any).liquor_data?.cocoaVariety || '',
        
        // Files and terms
        attachedDocuments: [], // Files are not stored in database drafts
        agreedToTerms: draft.agreed_to_terms
      };

      setSubmission(draftSubmission);
      
      // Find and set the selected contest
      const contest = contests.find(c => c.id === draft.contest_id);
      if (contest) {
        setSelectedContest(contest);
      }
      
      // Set current step to the appropriate step based on data completeness
      if (draft.product_type && draft.contest_id) {
        setCurrentStep(3); // Go to Origin & Owner step
      } else if (draft.contest_id) {
        setCurrentStep(2); // Go to Contest step
      } else {
        setCurrentStep(1); // Stay on Product Type step
      }

      toast({
        title: t('pages.sampleSubmission.toasts.draftLoaded'),
        description: t('pages.sampleSubmission.toasts.draftLoadedDesc'),
      });
    } catch (error) {
      console.error('Error loading draft:', error);
      toast({
        title: t('pages.sampleSubmission.toasts.errorLoadingDraft'),
        description: error instanceof Error ? error.message : t('pages.sampleSubmission.toasts.unknownError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Legacy localStorage draft loading (for backward compatibility)
  const loadDraft = () => {
    const savedDraft = localStorage.getItem('sampleSubmissionDraft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setSubmission(prev => ({
          ...prev,
          ...draftData,
          attachedDocuments: [] // Reset files
        }));
        toast({
          title: t('pages.sampleSubmission.toasts.draftLoaded'),
          description: t('pages.sampleSubmission.toasts.draftLoadedDesc'),
        });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('sampleSubmissionDraft');
  };

  // Form validation function
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Common validations
    if (!submission.contestId) {
      errors.push(t('pages.sampleSubmission.validation.selectContest'));
    }

    if (!submission.agreedToTerms) {
      errors.push(t('pages.sampleSubmission.validation.acceptTerms'));
    }

    // Product type specific validations
    if (submission.productType === 'bean') {
      if (!submission.country) errors.push(t('pages.sampleSubmission.validation.countryRequired'));
      if (!submission.farmName) errors.push(t('pages.sampleSubmission.validation.farmNameRequired'));
      if (!submission.ownerFullName) errors.push(t('pages.sampleSubmission.validation.ownerFullNameRequired'));
      if (!submission.lotNumber) errors.push(t('pages.sampleSubmission.validation.lotNumberRequired'));
    } else if (submission.productType === 'chocolate') {
      if (!submission.chocolateName) errors.push(t('pages.sampleSubmission.validation.chocolateNameRequired'));
      if (!submission.chocolateBrand) errors.push(t('pages.sampleSubmission.validation.brandRequired'));
      if (!submission.chocolateBatch) errors.push(t('pages.sampleSubmission.validation.batchRequired'));
      if (!submission.chocolateProductionDate) errors.push(t('pages.sampleSubmission.validation.productionDateRequired'));
      if (!submission.chocolateManufacturerCountry) errors.push(t('pages.sampleSubmission.validation.manufacturerCountryRequired'));
      if (!submission.chocolateCocoaOriginCountry) errors.push(t('pages.sampleSubmission.validation.cocoaOriginCountryRequired'));
      if (!submission.chocolateCocoaVariety) errors.push(t('pages.sampleSubmission.validation.cocoaVarietyRequired'));
      if (!submission.chocolateType) errors.push(t('pages.sampleSubmission.validation.chocolateTypeRequired'));
      if (submission.chocolateCocoaPercentage <= 0) errors.push(t('pages.sampleSubmission.validation.cocoaPercentagePositive'));
      if (submission.chocolateSweeteners.length === 0) errors.push(t('pages.sampleSubmission.validation.sweetenerRequired'));
      if (submission.chocolateLecithin.length === 0) errors.push(t('pages.sampleSubmission.validation.lecithinRequired'));
    } else if (submission.productType === 'liquor') {
      if (!submission.lotNumber) errors.push(t('pages.sampleSubmission.validation.lotNumberRequired'));
      if (!submission.liquorName) errors.push(t('pages.sampleSubmission.validation.liquorNameRequired'));
      if (!submission.liquorBrand) errors.push(t('pages.sampleSubmission.validation.brandProcessorRequired'));
      if (!submission.liquorBatch) errors.push(t('pages.sampleSubmission.validation.batchRequired'));
      if (!submission.liquorProcessingDate) errors.push(t('pages.sampleSubmission.validation.processingDateRequired'));
      if (!submission.liquorCountryProcessing) errors.push(t('pages.sampleSubmission.validation.countryProcessingRequired'));
      if (submission.lecithinPercentage < 0) errors.push(t('pages.sampleSubmission.validation.lecithinPercentageNonNegative'));
      if (!submission.liquorProcessingMethod) errors.push(t('pages.sampleSubmission.validation.processingMethodRequired'));
      if (!submission.liquorCocoaOriginCountry) errors.push(t('pages.sampleSubmission.validation.cocoaOriginCountryRequired'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: t('pages.sampleSubmission.steps.step1.title') },
      { number: 2, title: t('pages.sampleSubmission.steps.step2.title') },
      { number: 3, title: t('pages.sampleSubmission.steps.step3.title') },
      { number: 4, title: t('pages.sampleSubmission.steps.step4.title') }
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
    <div className="space-y-6">
      {/* Terms and Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.termsAndConditions.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.termsAndConditions.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="agree" 
              checked={submission.agreedToTerms} 
              onCheckedChange={(c)=> setSubmission(p=>({...p, agreedToTerms: !!c}))} 
            />
            <Label htmlFor="agree" className="text-xs sm:text-sm leading-relaxed">
              {t('pages.sampleSubmission.termsAndConditions.text')}
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleSaveAsDraft}
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {t('pages.sampleSubmission.buttons.saveAsDraft')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !submission.agreedToTerms} 
              className="w-full sm:w-auto bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pages.sampleSubmission.buttons.submitRegistration')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // UI RENDERING
  if (currentStep === 7) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('pages.sampleSubmission.success.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('pages.sampleSubmission.success.subtitle')}</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-4">{t('pages.sampleSubmission.success.allSet')}</h3>

            <div className="space-y-4 text-left">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('pages.sampleSubmission.success.detailsTitle')}</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="break-words">{t('pages.sampleSubmission.success.contest')}: {selectedContest?.name}</div>
                  <div className="break-words">{t('pages.sampleSubmission.success.owner')}: {submission.ownerFullName}</div>
                  <div className="break-words">{t('pages.sampleSubmission.success.farm')}: {submission.farmName}</div>
                  <div className="font-mono font-semibold text-blue-600 break-all">{t('pages.sampleSubmission.success.trackingCode')}: {submission.trackingCode}</div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('pages.sampleSubmission.success.nextStepsTitle')}</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div>{t('pages.sampleSubmission.success.step1')}</div>
                  <div>{t('pages.sampleSubmission.success.step2')}</div>
                  <div>{t('pages.sampleSubmission.success.step3')}</div>
                  <div>{t('pages.sampleSubmission.success.step4')}</div>
                  <div>{t('pages.sampleSubmission.success.step5')}</div>
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
                    toast({ title: t('pages.sampleSubmission.toasts.qrNotAvailable'), description: t('pages.sampleSubmission.toasts.tryAgainLater'), variant: 'destructive' });
                  }
                }}
                disabled={!submission.qrCodeUrl}
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span className="text-xs sm:text-sm">{t('pages.sampleSubmission.buttons.downloadQR')}</span>
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={resetForm}
            >
              {t('pages.sampleSubmission.buttons.submitAnother')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('pages.sampleSubmission.title')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{t('pages.sampleSubmission.subtitle')}</p>
        
        {/* Load Draft Button */}
        {localStorage.getItem('sampleSubmissionDraft') && currentStep === 1 && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadDraft}
              className="text-xs"
            >
              {t('pages.sampleSubmission.buttons.loadPreviousDraft')}
            </Button>
          </div>
        )}
      </div>

      {renderStepIndicator()}

      {/* Step 1: Product Type Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step1.cardTitle')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step1.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'bean', label: t('pages.sampleSubmission.productTypes.bean') },
                  { key: 'liquor', label: t('pages.sampleSubmission.productTypes.liquor') },
                  { key: 'chocolate', label: t('pages.sampleSubmission.productTypes.chocolate') },
                ].map(pt => (
                  <div
                    key={pt.key}
                    className={`p-4 border rounded-lg cursor-pointer ${submission.productType === pt.key ? 'border-[hsl(var(--chocolate-medium))] shadow-[var(--shadow-chocolate)]' : ''}`}
                    onClick={() => setSubmission(prev => ({ ...prev, productType: pt.key as ProductType }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{pt.label}</div>
                      {submission.productType === pt.key && <Badge variant="default" className="text-xs">{t('pages.sampleSubmission.labels.selected')}</Badge>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" disabled className="w-full sm:w-auto">{t('pages.sampleSubmission.buttons.back')}</Button>
                <Button onClick={() => setCurrentStep(2)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">
                  {t('pages.sampleSubmission.buttons.continue')}
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
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step2.cardTitle')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step2.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col sm:flex-row justify-center items-center py-8 sm:py-12 gap-3 sm:gap-2">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[hsl(var(--chocolate-medium))]" />
                  <span className="text-sm sm:text-base text-muted-foreground">{t('pages.sampleSubmission.labels.loadingContests')}</span>
                </div>
              ) : contests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{t('pages.sampleSubmission.labels.noContestsAvailable')}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('pages.sampleSubmission.labels.checkBackLater')}</p>
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
                              <Badge variant="default" className="text-xs w-fit">{t('pages.sampleSubmission.labels.open')}</Badge>
                              {isSelected && <Badge variant="secondary" className="text-xs">{t('pages.sampleSubmission.labels.selected')}</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-4">{contest.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{t('pages.sampleSubmission.labels.registration')}: {contest.registrationDeadline}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{t('pages.sampleSubmission.labels.submission')}: {contest.submissionDeadline}</span>
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
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">{t('pages.sampleSubmission.buttons.back')}</Button>
                <Button onClick={() => setCurrentStep(3)} disabled={!selectedContest} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">
                  {t('pages.sampleSubmission.buttons.continue')}
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
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step3.cardTitle')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step3.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Contest information */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">{t('pages.sampleSubmission.labels.contest')}</h4>
                <p className="text-blue-800 text-xs sm:text-sm break-words">{selectedContest.name}</p>
              </div>

              {/* Origin Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">{t('pages.sampleSubmission.bean.originDataTitle')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="country" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.country')}</Label>
                    <Select value={submission.country} onValueChange={(value) => setSubmission(prev => ({ ...prev, country: value }))}>
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder={t('pages.sampleSubmission.bean.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.department')}</Label>
                    <Input id="department" value={submission.department} onChange={(e) => setSubmission(prev => ({ ...prev, department: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.departmentPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="municipality" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.municipality')}</Label>
                    <Input id="municipality" value={submission.municipality} onChange={(e) => setSubmission(prev => ({ ...prev, municipality: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.municipalityPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="district" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.district')}</Label>
                    <Input id="district" value={submission.district} onChange={(e) => setSubmission(prev => ({ ...prev, district: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.districtPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="farmName" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.farmName')}</Label>
                    <Input id="farmName" value={submission.farmName} onChange={(e) => setSubmission(prev => ({ ...prev, farmName: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.farmNamePlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                </div>
              </div>

              {/* Owner Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">{t('pages.sampleSubmission.bean.ownerInformationTitle')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="ownerFullName" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.ownerFullName')}</Label>
                    <Input id="ownerFullName" value={submission.ownerFullName} onChange={(e) => setSubmission(prev => ({ ...prev, ownerFullName: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.ownerFullNamePlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="identificationDocument" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.identificationDocument')}</Label>
                    <Input id="identificationDocument" value={submission.identificationDocument} onChange={(e) => setSubmission(prev => ({ ...prev, identificationDocument: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.identificationDocumentPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.phoneNumber')}</Label>
                    <Input id="phoneNumber" value={submission.phoneNumber} onChange={(e) => setSubmission(prev => ({ ...prev, phoneNumber: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.phoneNumberPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.email')}</Label>
                    <Input id="email" type="email" value={submission.email} onChange={(e) => setSubmission(prev => ({ ...prev, email: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.emailPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="homeAddress" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.homeAddress')}</Label>
                    <Input id="homeAddress" value={submission.homeAddress} onChange={(e) => setSubmission(prev => ({ ...prev, homeAddress: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.homeAddressPlaceholder')} className="text-xs sm:text-sm" />
                  </div>
                  <div className="flex items-center space-x-2 sm:col-span-2">
                    <Checkbox id="belongsToCooperative" checked={submission.belongsToCooperative} onCheckedChange={(checked) => setSubmission(prev => ({ ...prev, belongsToCooperative: !!checked }))} />
                    <Label htmlFor="belongsToCooperative" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.belongsToCooperative')}</Label>
                  </div>
                  {submission.belongsToCooperative && (
                    <div className="sm:col-span-2">
                      <Label htmlFor="cooperativeName" className="text-xs sm:text-sm">{t('pages.sampleSubmission.bean.cooperativeName')}</Label>
                      <Input id="cooperativeName" value={submission.cooperativeName} onChange={(e) => setSubmission(prev => ({ ...prev, cooperativeName: e.target.value }))} placeholder={t('pages.sampleSubmission.bean.cooperativeNamePlaceholder')} className="text-xs sm:text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">{t('pages.sampleSubmission.buttons.back')}</Button>
                <Button onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">{t('pages.sampleSubmission.buttons.continue')}</Button>
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
                <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step4.cardTitleBean')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step4.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bean Basic */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.bean.beanBasicTitle')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.lotNumber')}</Label>
                      <Input value={submission.lotNumber} onChange={(e)=>setSubmission(p=>({...p, lotNumber:e.target.value}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.harvestDate')}</Label>
                      <Input type="date" value={submission.harvestDate} onChange={(e)=>setSubmission(p=>({...p, harvestDate:e.target.value}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.growingAltitude')}</Label>
                      <Input type="number" min="0" value={submission.growingAltitudeMasl} onChange={(e)=>setSubmission(p=>({...p, growingAltitudeMasl: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>

                {/* Sample Information */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.bean.sampleInformationTitle')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.quantity')}</Label>
                      <Input type="number" min="0" step="0.1" value={submission.quantity} onChange={(e)=>setSubmission(p=>({...p, quantity: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.geneticMaterial')}</Label>
                      <Input
                        value={submission.geneticMaterial}
                        onChange={(e)=>setSubmission(p=>({...p, geneticMaterial: e.target.value}))}
                        placeholder={t('pages.sampleSubmission.bean.geneticMaterialPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.cropAge')}</Label>
                      <Input type="number" min="0" value={submission.cropAge} onChange={(e)=>setSubmission(p=>({...p, cropAge: parseInt(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.sampleSourceArea')}</Label>
                      <Input type="number" min="0" step="0.01" value={submission.sampleSourceHectares} onChange={(e)=>setSubmission(p=>({...p, sampleSourceHectares: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.moistureContent')}</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={submission.moistureContent} onChange={(e)=>setSubmission(p=>({...p, moistureContent: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.fermentationPercentage')}</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={submission.fermentationPercentage} onChange={(e)=>setSubmission(p=>({...p, fermentationPercentage: parseFloat(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>

                {/* Processing */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.bean.processingTitle')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.fermenterType')}</Label>
                      <Select value={submission.fermenterType} onValueChange={(v)=>setSubmission(p=>({...p, fermenterType:v}))}>
                        <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                        <SelectContent>
                          {fermenterTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.fermentationTime')}</Label>
                      <Input type="number" min="0" value={submission.fermentationTime} onChange={(e)=>setSubmission(p=>({...p, fermentationTime: parseInt(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.dryingType')}</Label>
                      <Select value={submission.dryingType} onValueChange={(v)=>setSubmission(p=>({...p, dryingType:v}))}>
                        <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                        <SelectContent>
                          {dryingTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.bean.dryingTime')}</Label>
                      <Input type="number" min="0" value={submission.dryingTime} onChange={(e)=>setSubmission(p=>({...p, dryingTime: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.bean.certificationsTitle')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-org" checked={submission.beanCertifications.organic} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, organic: !!c}}))} />
                      <Label htmlFor="cert-org">{t('pages.sampleSubmission.bean.certOrganic')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-ft" checked={submission.beanCertifications.fairtrade} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, fairtrade: !!c}}))} />
                      <Label htmlFor="cert-ft">{t('pages.sampleSubmission.bean.certFairtrade')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-dt" checked={submission.beanCertifications.directTrade} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, directTrade: !!c}}))} />
                      <Label htmlFor="cert-dt">{t('pages.sampleSubmission.bean.certDirectTrade')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-none" checked={submission.beanCertifications.none} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, none: !!c}}))} />
                      <Label htmlFor="cert-none">{t('pages.sampleSubmission.bean.certNone')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cert-other" checked={submission.beanCertifications.other} onCheckedChange={(c)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, other: !!c}}))} />
                      <Label htmlFor="cert-other">{t('pages.sampleSubmission.bean.certOther')}</Label>
                    </div>
                    {submission.beanCertifications.other && (
                      <div className="sm:col-span-2">
                        <Input placeholder={t('pages.sampleSubmission.bean.certOtherPlaceholder')} value={submission.beanCertifications.otherText} onChange={(e)=>setSubmission(p=>({...p, beanCertifications: {...p.beanCertifications, otherText: e.target.value}}))} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chocolate-specific processing and additional fields */}
          {submission.productType === 'chocolate' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step4.cardTitleChocolate')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step4.descriptionChocolate')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 1 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.chocolate.section1Title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.chocolateName')}</Label>
                    <Input value={submission.chocolateName} onChange={(e)=>setSubmission(p=>({...p,chocolateName:e.target.value}))} placeholder={t('pages.sampleSubmission.chocolate.chocolateNamePlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.brand')}</Label>
                    <Input value={submission.chocolateBrand} onChange={(e)=>setSubmission(p=>({...p,chocolateBrand:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.batch')}</Label>
                    <Input value={submission.chocolateBatch} onChange={(e)=>setSubmission(p=>({...p,chocolateBatch:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.productionDate')}</Label>
                    <Input type="date" value={submission.chocolateProductionDate} onChange={(e)=>setSubmission(p=>({...p,chocolateProductionDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.manufacturerCountry')}</Label>
                    <Select value={submission.chocolateManufacturerCountry} onValueChange={(value) => setSubmission(p => ({ ...p, chocolateManufacturerCountry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('pages.sampleSubmission.bean.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.cocoaOriginCountry')}</Label>
                    <Select value={submission.chocolateCocoaOriginCountry} onValueChange={(value) => setSubmission(p => ({ ...p, chocolateCocoaOriginCountry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('pages.sampleSubmission.bean.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.chocolate.section2Title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.region')}</Label>
                    <Input value={submission.chocolateRegion} onChange={(e)=>setSubmission(p=>({...p,chocolateRegion:e.target.value}))} placeholder={t('pages.sampleSubmission.chocolate.regionPlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.municipality')}</Label>
                    <Input value={submission.chocolateMunicipality} onChange={(e)=>setSubmission(p=>({...p,chocolateMunicipality:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.farmName')}</Label>
                    <Input value={submission.chocolateFarmName} onChange={(e)=>setSubmission(p=>({...p,chocolateFarmName:e.target.value}))} placeholder={t('pages.sampleSubmission.chocolate.farmNamePlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.cocoaVariety')}</Label>
                    <Input value={submission.chocolateCocoaVariety} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaVariety:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.fermentationMethod')}</Label>
                    <Select value={submission.chocolateFermentationMethod} onValueChange={(v)=>setSubmission(p=>({...p,chocolateFermentationMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                      <SelectContent>
                        {['Wooden Crates','Baskets','Leaves','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.dryingMethod')}</Label>
                    <Select value={submission.chocolateDryingMethod} onValueChange={(v)=>setSubmission(p=>({...p,chocolateDryingMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                      <SelectContent>
                        {['Solar','Dryer','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.chocolate.section3Title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.chocolateType')}</Label>
                    <Select value={submission.chocolateType} onValueChange={(v)=>setSubmission(p=>({...p,chocolateType:v}))}>
                      <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.chocolate.chocolateTypePlaceholder')}/></SelectTrigger>
                      <SelectContent>
                        {chocolateTypes.map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.cocoaPercentage')}</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.chocolateCocoaPercentage} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.cocoaButterPercentage')}</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.chocolateCocoaButterPercentage} onChange={(e)=>setSubmission(p=>({...p,chocolateCocoaButterPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.sweetener')}</Label>
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
                      <Input className="mt-2" placeholder={t('pages.sampleSubmission.chocolate.sweetenerOtherPlaceholder')} value={submission.chocolateSweetenerOther} onChange={(e)=>setSubmission(p=>({...p,chocolateSweetenerOther:e.target.value}))} />
                    )}
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.lecithin')}</Label>
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
                    <Label>{t('pages.sampleSubmission.chocolate.naturalFlavors')}</Label>
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
                      <Input className="mt-2" placeholder={t('pages.sampleSubmission.chocolate.naturalFlavorsOtherPlaceholder')} value={submission.chocolateNaturalFlavorsOther} onChange={(e)=>setSubmission(p=>({...p,chocolateNaturalFlavorsOther:e.target.value}))} />
                    )}
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.chocolate.allergens')}</Label>
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
                  <Label>{t('pages.sampleSubmission.chocolate.certifications')}</Label>
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
                    <Input className="mt-2" placeholder={t('pages.sampleSubmission.chocolate.certificationsOtherPlaceholder')} value={submission.chocolateCertificationsOther} onChange={(e)=>setSubmission(p=>({...p,chocolateCertificationsOther:e.target.value}))} />
                  )}
                </div>
                {/* Section 4 */}
                <div className="mt-4">
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.chocolate.section4Title')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pages.sampleSubmission.chocolate.conchingTime')}</Label>
                      <Input type="number" min="0" step="0.1" value={submission.conchingTimeHours} onChange={(e)=>setSubmission(p=>({...p,conchingTimeHours: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.chocolate.conchingTemperature')}</Label>
                      <Input type="number" min="0" step="0.1" value={submission.conchingTemperatureCelsius} onChange={(e)=>setSubmission(p=>({...p,conchingTemperatureCelsius: parseFloat(e.target.value)||0}))} />
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.chocolate.temperingMethod')}</Label>
                      <Select value={submission.temperingMethod} onValueChange={(v)=>setSubmission(p=>({...p,temperingMethod:v}))}>
                        <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                        <SelectContent>
                          {temperingMethods.map(method=> <SelectItem key={method} value={method}>{method}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('pages.sampleSubmission.chocolate.finalGranulation')}</Label>
                      <Input type="number" min="0" value={submission.finalGranulationMicrons} onChange={(e)=>setSubmission(p=>({...p,finalGranulationMicrons: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                </div>
                {/* Section 5 */}
                <div className="mt-4">
                  <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.chocolate.section5Title')}</h4>
                  <RadioGroup
                    value={submission.competitionCategory}
                    onValueChange={(value)=>setSubmission(prev=>({...prev, competitionCategory: value}))}
                    className="space-y-4"
                  >
                    <div>
                      <Label className="text-sm font-semibold uppercase text-muted-foreground">{t('pages.sampleSubmission.chocolate.darkChocolate')}</Label>
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
                      <Label className="text-sm font-semibold uppercase text-muted-foreground">{t('pages.sampleSubmission.chocolate.otherCategories')}</Label>
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
                  
                  {/* Inclusions Checkbox - separate from category selection */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="with-inclusions"
                        checked={submission.withInclusions}
                        onCheckedChange={(checked) => 
                          setSubmission(prev => ({ ...prev, withInclusions: checked === true }))
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="with-inclusions" className="font-normal text-sm">
                        {t('pages.sampleSubmission.chocolate.withInclusions')}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Liquor-specific processing and additional fields */}
          {submission.productType === 'liquor' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.steps.step4.cardTitleLiquor')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('pages.sampleSubmission.steps.step4.descriptionLiquor')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 1 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.liquor.section1Title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.lotNumber')}</Label>
                    <Input value={submission.lotNumber} onChange={(e)=>setSubmission(p=>({...p, lotNumber:e.target.value}))} placeholder={t('pages.sampleSubmission.liquor.lotNumberPlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.harvestDate')}</Label>
                    <Input type="date" value={submission.harvestDate} onChange={(e)=>setSubmission(p=>({...p, harvestDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.liquorName')}</Label>
                    <Input value={submission.liquorName} onChange={(e)=>setSubmission(p=>({...p, liquorName:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.brandProcessor')}</Label>
                    <Input value={submission.liquorBrand} onChange={(e)=>setSubmission(p=>({...p, liquorBrand:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.batch')}</Label>
                    <Input value={submission.liquorBatch} onChange={(e)=>setSubmission(p=>({...p, liquorBatch:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.processingDate')}</Label>
                    <Input type="date" value={submission.liquorProcessingDate} onChange={(e)=>setSubmission(p=>({...p, liquorProcessingDate:e.target.value}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.countryProcessing')}</Label>
                    <Select value={submission.liquorCountryProcessing} onValueChange={(value) => setSubmission(p => ({ ...p, liquorCountryProcessing: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('pages.sampleSubmission.bean.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('pages.sampleSubmission.liquor.section2Title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.lecithinPercentage')}</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.lecithinPercentage} onChange={(e)=>setSubmission(p=>({...p, lecithinPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.cocoaButterPercentage')}</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={submission.liquorCocoaButterPercentage} onChange={(e)=>setSubmission(p=>({...p, liquorCocoaButterPercentage: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.grindingTemperature')}</Label>
                    <Input type="number" step="0.1" value={submission.grindingTemperatureCelsius} onChange={(e)=>setSubmission(p=>({...p, grindingTemperatureCelsius: parseFloat(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.grindingTime')}</Label>
                    <Input type="number" min="0" value={submission.grindingTimeHours} onChange={(e)=>setSubmission(p=>({...p, grindingTimeHours: parseInt(e.target.value)||0}))} />
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.processingMethod')}</Label>
                    <Select value={submission.liquorProcessingMethod} onValueChange={(v)=>setSubmission(p=>({...p, liquorProcessingMethod:v}))}>
                      <SelectTrigger><SelectValue placeholder={t('pages.sampleSubmission.labels.select')}/></SelectTrigger>
                      <SelectContent>
                        {['Artisanal','Industrial','Mixed'].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.cocoaOriginCountry')}</Label>
                    <Select value={submission.liquorCocoaOriginCountry} onValueChange={(value) => setSubmission(p => ({ ...p, liquorCocoaOriginCountry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('pages.sampleSubmission.bean.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('pages.sampleSubmission.liquor.cocoaVariety')}</Label>
                    <Input value={submission.liquorCocoaVariety} onChange={(e)=>setSubmission(p=>({...p, liquorCocoaVariety:e.target.value}))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Additional Sample Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('pages.sampleSubmission.additionalDescription.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('pages.sampleSubmission.additionalDescription.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="additional-sample-description" className="text-sm font-medium">
                  {t('pages.sampleSubmission.additionalDescription.label')}
                </Label>
                <Textarea
                  id="additional-sample-description"
                  value={submission.additionalSampleDescription}
                  onChange={(event) =>
                    setSubmission((previous) => ({
                      ...previous,
                      additionalSampleDescription: event.target.value,
                    }))
                  }
                  placeholder={t('pages.sampleSubmission.additionalDescription.placeholder')}
                  // maxLength={500}
                  className="min-h-[140px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('pages.sampleSubmission.additionalDescription.hint')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attached Documentation Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                {t('pages.sampleSubmission.attachedDocumentation.title')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('pages.sampleSubmission.attachedDocumentation.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Button */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[hsl(var(--chocolate-medium))] transition-colors">
                <label htmlFor="document-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div className="text-sm">
                      <span className="font-medium text-[hsl(var(--chocolate-medium))]">{t('pages.sampleSubmission.attachedDocumentation.clickToUpload')}</span>
                      <span className="text-gray-500"> {t('pages.sampleSubmission.attachedDocumentation.orDragDrop')}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('pages.sampleSubmission.attachedDocumentation.fileTypes')}
                    </div>
                  </div>
                  <input
                    id="document-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                  />
                </label>
              </div>

              {/* Uploaded Documents List */}
              {submission.attachedDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('pages.sampleSubmission.attachedDocumentation.uploadedDocuments', { count: submission.attachedDocuments.length })}</Label>
                  {submission.attachedDocuments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-[hsl(var(--chocolate-medium))]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Document Type Hints */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{t('pages.sampleSubmission.attachedDocumentation.healthCertificates')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{t('pages.sampleSubmission.attachedDocumentation.productPhotos')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>{t('pages.sampleSubmission.attachedDocumentation.laboratoryAnalysis')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>{t('pages.sampleSubmission.attachedDocumentation.otherDocuments')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="w-full sm:w-auto">{t('pages.sampleSubmission.buttons.back')}</Button>
            <Button disabled onClick={() => setCurrentStep(4)} className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto">{t('pages.sampleSubmission.buttons.continue')}</Button>
          </div>
          
          {/* Terms & Submit for all */}
          <TermsAndSubmit />
        </div>
      )}
    </div>
  );
};

export default SampleSubmission;