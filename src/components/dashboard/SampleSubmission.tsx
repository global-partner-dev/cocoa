import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DollarSign, 
  QrCode, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  MapPin,
  Leaf,
  Award,
  CreditCard,
  Download,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SampleSubmissionService, type SampleSubmissionContest } from "@/lib/sampleSubmissionService";
import { SamplesService, type SampleSubmissionData } from "@/lib/samplesService";
import type { Sample } from "@/lib/samplesService";
import PayPalButtonsMount from '@/components/payments/PayPalButtonsMount';
import visa from "@/assets/visa.png";
import nequi from "@/assets/nequi.png";
import paypal from "@/assets/paypal.png";
import { useTranslation } from "react-i18next";

// Use the SampleSubmissionContest type from the service
type Contest = SampleSubmissionContest;

interface SampleSubmission {
  id?: string;
  contestId: string;
  contestName: string;
  trackingCode?: string;
  qrCodeUrl?: string;
  
  // Sample Origin Data
  country: string;
  department: string;
  municipality: string;
  district: string;
  farmName: string;
  cocoaAreaHectares: number;
  
  // Sample Owner Data
  ownerFullName: string;
  identificationDocument: string;
  phoneNumber: string;
  email: string;
  homeAddress: string;
  belongsToCooperative: boolean;
  cooperativeName: string;
  
  // Sample Information
  quantity: number; // 3kg required
  geneticMaterial: string;
  cropAge: number;
  sampleSourceHectares: number;
  moistureContent: number;
  fermentationPercentage: number;
  
  // Processing Information
  fermenterType: string;
  fermentationTime: number; // in hours
  dryingType: string;
  dryingTime: number; // in hours
  
  // Additional fields
  variety: string;
  paymentMethod: 'credit_card' | 'nequi' | 'paypal';
  agreedToTerms: boolean;
}

// Mock contests removed - now using real database data

const cocoaVarieties = [
  'Trinitario',
  'Criollo',
  'Forastero',
  'Nacional',
  'CCN-51',
  'ICS-1',
  'TSH-565',
  'Other'
];

const processingMethods = [
  'Traditional Fermentation',
  'Controlled Fermentation',
  'Solar Drying',
  'Mechanical Drying',
  'Wet Processing',
  'Dry Processing',
  'Organic Processing'
];



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

const SampleSubmission = () => {
  const { t } = useTranslation();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [submission, setSubmission] = useState<SampleSubmission>({
    contestId: '',
    contestName: '',
    
    // Sample Origin Data
    country: '',
    department: '',
    municipality: '',
    district: '',
    farmName: '',
    cocoaAreaHectares: 0,
    
    // Sample Owner Data
    ownerFullName: '',
    identificationDocument: '',
    phoneNumber: '',
    email: '',
    homeAddress: '',
    belongsToCooperative: false,
    cooperativeName: '',
    
    // Sample Information
    quantity: 3, // 3kg required
    geneticMaterial: '',
    cropAge: 0,
    sampleSourceHectares: 0,
    moistureContent: 0,
    fermentationPercentage: 0,
    
    // Processing Information
    fermenterType: '',
    fermentationTime: 0,
    dryingType: '',
    dryingTime: 0,
    
    // Additional fields
    variety: '',
    paymentMethod: 'credit_card',
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
          title: t('dashboard.sampleSubmission.toasts.error'),
          description: t('dashboard.sampleSubmission.toasts.errorDescription'),
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
    setCurrentStep(2);
  };

  const calculateTotalFee = () => {
    if (!selectedContest) return 0;
    return selectedContest.entryFee + selectedContest.sampleFee;
  };

  const handleSubmit = async (): Promise<Sample | undefined> => {
    if (!selectedContest || !submission.agreedToTerms) {
      toast({
        title: t('dashboard.sampleSubmission.toasts.submissionError'),
        description: t('dashboard.sampleSubmission.toasts.submissionErrorDescription'),
        variant: "destructive"
      });
      return undefined;
    }

    // Block submission for disabled payment methods
    if (submission.paymentMethod === 'credit_card' || submission.paymentMethod === 'nequi') {
      toast({
        title: t('dashboard.sampleSubmission.toasts.paymentNotAvailable'),
        description: t('dashboard.sampleSubmission.toasts.paymentNotAvailableDescription'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare submission data for the database service
      const submissionData: SampleSubmissionData = {
        contestId: submission.contestId,
        
        // Sample Origin Data
        country: submission.country,
        department: submission.department || undefined,
        municipality: submission.municipality || undefined,
        district: submission.district || undefined,
        farmName: submission.farmName,
        cocoaAreaHectares: submission.cocoaAreaHectares || undefined,
        
        // Sample Owner Data
        ownerFullName: submission.ownerFullName,
        identificationDocument: submission.identificationDocument || undefined,
        phoneNumber: submission.phoneNumber || undefined,
        email: submission.email || undefined,
        homeAddress: submission.homeAddress || undefined,
        belongsToCooperative: submission.belongsToCooperative,
        cooperativeName: submission.cooperativeName || undefined,
        
        // Sample Information
        quantity: submission.quantity,
        geneticMaterial: submission.geneticMaterial || undefined,
        cropAge: submission.cropAge || undefined,
        sampleSourceHectares: submission.sampleSourceHectares || undefined,
        moistureContent: submission.moistureContent || undefined,
        fermentationPercentage: submission.fermentationPercentage || undefined,
        
        // Processing Information
        fermenterType: submission.fermenterType || undefined,
        fermentationTime: submission.fermentationTime || undefined,
        dryingType: submission.dryingType || undefined,
        dryingTime: submission.dryingTime || undefined,
        
        // Additional Information
        variety: submission.variety || undefined,
        
        // Payment Information
        paymentMethod: submission.paymentMethod,
        
        // Terms Agreement
        agreedToTerms: submission.agreedToTerms
      };

      // Submit sample to database
      const submittedSample = await SamplesService.submitSample(submissionData);
      
      toast({
        title: t('dashboard.sampleSubmission.toasts.submissionSuccess'),
        description: t('dashboard.sampleSubmission.toasts.submissionSuccessDescription', {
          trackingCode: submittedSample.tracking_code
        }),
      });
      
      // Store the submitted sample data for the success screen
      setSubmission(prev => ({
        ...prev,
        id: submittedSample.id,
        trackingCode: submittedSample.tracking_code,
        qrCodeUrl: submittedSample.qr_code_url
      }));
      
      setCurrentStep(6); // Success step
      return submittedSample;
    } catch (error) {
      console.error('Error submitting sample:', error);
      toast({
        title: t('dashboard.sampleSubmission.toasts.submissionFailed'),
        description: t('dashboard.sampleSubmission.toasts.submissionFailedDescription'),
        variant: "destructive"
      });
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: t('dashboard.sampleSubmission.steps.contest') },
      { number: 2, title: t('dashboard.sampleSubmission.steps.originOwner') },
      { number: 3, title: t('dashboard.sampleSubmission.steps.sampleInfo') },
      { number: 4, title: t('dashboard.sampleSubmission.steps.processing') },
      { number: 5, title: t('dashboard.sampleSubmission.steps.payment') }
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

  if (currentStep === 6) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.sampleSubmission.success.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.sampleSubmission.success.subtitle')}</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-8 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-4">{t('dashboard.sampleSubmission.success.complete')}</h3>
            
            <div className="space-y-4 text-left">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('dashboard.sampleSubmission.success.details.title')}</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="break-words">{t('dashboard.sampleSubmission.success.details.contest')} {selectedContest?.name}</div>
                  <div className="break-words">{t('dashboard.sampleSubmission.success.details.owner')} {submission.ownerFullName}</div>
                  <div className="break-words">{t('dashboard.sampleSubmission.success.details.farm')} {submission.farmName}</div>
                  <div className="font-mono font-semibold text-blue-600 break-all">
                    {t('dashboard.sampleSubmission.success.details.trackingCode')} {submission.trackingCode}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('dashboard.sampleSubmission.success.nextSteps.title')}</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.registered')}</div>
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.qrGenerated')}</div>
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.package')}</div>
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.attach')}</div>
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.ship')}</div>
                  <div>{t('dashboard.sampleSubmission.success.nextSteps.payment')}</div>
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
                    toast({
                      title: t('dashboard.sampleSubmission.success.qrNotAvailable'),
                      description: t('dashboard.sampleSubmission.success.qrNotAvailableDescription'),
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!submission.qrCodeUrl}
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.success.downloadQR')}</span>
              </Button>
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => {
                setCurrentStep(1);
                setSelectedContest(null);
                setSubmission({
                  contestId: '',
                  contestName: '',
                  
                  // Sample Origin Data
                  country: '',
                  department: '',
                  municipality: '',
                  district: '',
                  farmName: '',
                  cocoaAreaHectares: 0,
                  
                  // Sample Owner Data
                  ownerFullName: '',
                  identificationDocument: '',
                  phoneNumber: '',
                  email: '',
                  homeAddress: '',
                  belongsToCooperative: false,
                  cooperativeName: '',
                  
                  // Sample Information
                  quantity: 3,
                  geneticMaterial: '',
                  cropAge: 0,
                  sampleSourceHectares: 0,
                  moistureContent: 0,
                  fermentationPercentage: 0,
                  
                  // Processing Information
                  fermenterType: '',
                  fermentationTime: 0,
                  dryingType: '',
                  dryingTime: 0,
                  
                  // Additional fields
                  variety: '',
                  paymentMethod: 'credit_card',
                  agreedToTerms: false
                });
              }}
            >
              {t('dashboard.sampleSubmission.success.submitAnother')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('dashboard.sampleSubmission.title')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{t('dashboard.sampleSubmission.subtitle')}</p>
      </div>

      {renderStepIndicator()}

      {/* Step 1: Contest Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleSubmission.contest.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.contest.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col sm:flex-row justify-center items-center py-8 sm:py-12 gap-3 sm:gap-2">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[hsl(var(--chocolate-medium))]" />
                  <span className="text-sm sm:text-base text-muted-foreground">{t('dashboard.sampleSubmission.contest.loading')}</span>
                </div>
              ) : contests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.sampleSubmission.contest.noContests')}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('dashboard.sampleSubmission.contest.noContestsDescription')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {contests.filter(c => c.status === 'open').map((contest) => (
                  <div
                    key={contest.id}
                    className="p-4 sm:p-6 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => handleContestSelect(contest)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--chocolate-dark))]">
                            {contest.name}
                          </h3>
                          <Badge variant="default" className="text-xs w-fit">{t('dashboard.sampleSubmission.contest.badge.open')}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4">{contest.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.contest.details.registration')} {contest.registrationDeadline}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.contest.details.submission')} {contest.submissionDeadline}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">{t('dashboard.sampleSubmission.contest.details.entry')} ${contest.entryFee}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">{t('dashboard.sampleSubmission.contest.details.sample')} ${contest.sampleFee}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-[hsl(var(--chocolate-dark))]">
                            {t('dashboard.sampleSubmission.contest.details.total')} ${contest.entryFee + contest.sampleFee}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-xs sm:text-sm">{t('dashboard.sampleSubmission.contest.details.categories')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {contest.categories.map((category) => (
                              <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <h4 className="font-medium text-xs sm:text-sm">{t('dashboard.sampleSubmission.contest.details.requirements')}</h4>
                          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                            {contest.requirements.map((req, index) => (
                              <li key={index}>• {req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Sample Origin Data & Owner Information */}
      {currentStep === 2 && selectedContest && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleSubmission.originOwner.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Contest Information */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">{t('dashboard.sampleSubmission.originOwner.contestName')}</h4>
                <p className="text-blue-800 text-xs sm:text-sm break-words">{selectedContest.name}</p>
              </div>

              {/* Sample Origin Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">{t('dashboard.sampleSubmission.originOwner.originData')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="country" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.country')} *</Label>
                    <Input
                      id="country"
                      value={submission.country}
                      onChange={(e) => setSubmission(prev => ({ ...prev, country: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.country')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.department')} *</Label>
                    <Input
                      id="department"
                      value={submission.department}
                      onChange={(e) => setSubmission(prev => ({ ...prev, department: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.department')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="municipality" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.municipality')} *</Label>
                    <Input
                      id="municipality"
                      value={submission.municipality}
                      onChange={(e) => setSubmission(prev => ({ ...prev, municipality: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.municipality')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="district" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.district')}</Label>
                    <Input
                      id="district"
                      value={submission.district}
                      onChange={(e) => setSubmission(prev => ({ ...prev, district: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.district')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="farmName" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.farmName')} *</Label>
                    <Input
                      id="farmName"
                      value={submission.farmName}
                      onChange={(e) => setSubmission(prev => ({ ...prev, farmName: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.farmName')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cocoaAreaHectares" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.cocoaAreaHectares')} *</Label>
                    <Input
                      id="cocoaAreaHectares"
                      type="number"
                      min="0"
                      step="0.1"
                      value={submission.cocoaAreaHectares}
                      onChange={(e) => setSubmission(prev => ({ ...prev, cocoaAreaHectares: parseFloat(e.target.value) || 0 }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.cocoaAreaHectares')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Sample Owner Data */}
              <div>
                <h4 className="font-medium mb-3 sm:mb-4 text-[hsl(var(--chocolate-dark))] text-sm sm:text-base">{t('dashboard.sampleSubmission.originOwner.ownerData')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="ownerFullName" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.ownerFullName')} *</Label>
                    <Input
                      id="ownerFullName"
                      value={submission.ownerFullName}
                      onChange={(e) => setSubmission(prev => ({ ...prev, ownerFullName: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.ownerFullName')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="identificationDocument" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.identificationDocument')} *</Label>
                    <Input
                      id="identificationDocument"
                      value={submission.identificationDocument}
                      onChange={(e) => setSubmission(prev => ({ ...prev, identificationDocument: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.identificationDocument')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.phoneNumber')} *</Label>
                    <Input
                      id="phoneNumber"
                      value={submission.phoneNumber}
                      onChange={(e) => setSubmission(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.phoneNumber')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.email')} *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={submission.email}
                      onChange={(e) => setSubmission(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.email')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="homeAddress" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.homeAddress')} *</Label>
                    <Input
                      id="homeAddress"
                      value={submission.homeAddress}
                      onChange={(e) => setSubmission(prev => ({ ...prev, homeAddress: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.homeAddress')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cooperative Information */}
              <div>
                <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                  <Checkbox
                    id="belongsToCooperative"
                    checked={submission.belongsToCooperative}
                    onCheckedChange={(checked) => setSubmission(prev => ({ ...prev, belongsToCooperative: checked as boolean }))}
                  />
                  <Label htmlFor="belongsToCooperative" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.belongsToCooperative')}</Label>
                </div>
                {submission.belongsToCooperative && (
                  <div>
                    <Label htmlFor="cooperativeName" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.originOwner.fields.cooperativeName')} *</Label>
                    <Input
                      id="cooperativeName"
                      value={submission.cooperativeName}
                      onChange={(e) => setSubmission(prev => ({ ...prev, cooperativeName: e.target.value }))}
                      placeholder={t('dashboard.sampleSubmission.originOwner.placeholders.cooperativeName')}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">
                  <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.buttons.back')}</span>
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
                >
                  <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.buttons.continue')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Sample Information */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleSubmission.sampleInfo.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.sampleInfo.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="quantity" className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.sampleInfo.fields.quantity')} *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="3"
                    max="5"
                    step="1"
                    value={submission.quantity}
                    onChange={(e) => setSubmission(prev => ({ ...prev, quantity: parseInt(e.target.value) || 3 }))}
                    placeholder={t('dashboard.sampleSubmission.sampleInfo.placeholders.quantity')}
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {t('dashboard.sampleSubmission.sampleInfo.hints.quantity')}
                  </p>
                </div>
                <div>
                  <Label htmlFor="geneticMaterial" className="text-xs sm:text-sm">Genetic Material *</Label>
                  <Input
                    id="geneticMaterial"
                    type="text"
                    value={submission.geneticMaterial}
                    onChange={(e) => setSubmission(prev => ({ ...prev, geneticMaterial: e.target.value }))}
                    placeholder="e.g., Trinitario, Criollo, Forastero"
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="cropAge" className="text-xs sm:text-sm">Crop Age (years) *</Label>
                  <Input
                    id="cropAge"
                    type="number"
                    min="1"
                    max="100"
                    value={submission.cropAge}
                    onChange={(e) => setSubmission(prev => ({ ...prev, cropAge: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 15"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="sampleSourceHectares" className="text-xs sm:text-sm">Number of hectares of crop where the sample comes from *</Label>
                  <Input
                    id="sampleSourceHectares"
                    type="number"
                    min="0"
                    step="0.1"
                    value={submission.sampleSourceHectares}
                    onChange={(e) => setSubmission(prev => ({ ...prev, sampleSourceHectares: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 2.5"
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="moistureContent" className="text-xs sm:text-sm">Sample moisture content (%) *</Label>
                  <Input
                    id="moistureContent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={submission.moistureContent}
                    onChange={(e) => setSubmission(prev => ({ ...prev, moistureContent: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 7.5"
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Optimal moisture content is between 6-8%
                  </p>
                </div>
                <div>
                  <Label htmlFor="fermentationPercentage" className="text-xs sm:text-sm">Sample fermentation percentage (%) *</Label>
                  <Input
                    id="fermentationPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={submission.fermentationPercentage}
                    onChange={(e) => setSubmission(prev => ({ ...prev, fermentationPercentage: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 85.0"
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Good fermentation is typically above 75%
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                  <span className="text-xs sm:text-sm">Back</span>
                </Button>
                <Button 
                  onClick={() => setCurrentStep(4)}
                  className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
                >
                  <span className="text-xs sm:text-sm">Continue</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Processing Information */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">5. Processing Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Details about fermentation and drying processes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="fermenterType" className="text-xs sm:text-sm">Fermenter Type *</Label>
                  <Select 
                    value={submission.fermenterType} 
                    onValueChange={(value) => setSubmission(prev => ({ ...prev, fermenterType: value }))}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select fermenter type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fermenterTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs sm:text-sm">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fermentationTime" className="text-xs sm:text-sm">Fermentation Time (hours) *</Label>
                  <Input
                    id="fermentationTime"
                    type="number"
                    min="0"
                    max="240"
                    value={submission.fermentationTime}
                    onChange={(e) => setSubmission(prev => ({ ...prev, fermentationTime: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 120"
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Typical fermentation time is 96-144 hours (4-6 days)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="dryingType" className="text-xs sm:text-sm">Drying Type *</Label>
                  <Select 
                    value={submission.dryingType} 
                    onValueChange={(value) => setSubmission(prev => ({ ...prev, dryingType: value }))}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select drying type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dryingTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs sm:text-sm">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dryingTime" className="text-xs sm:text-sm">Drying Time (hours) *</Label>
                  <Input
                    id="dryingTime"
                    type="number"
                    min="0"
                    max="500"
                    value={submission.dryingTime}
                    onChange={(e) => setSubmission(prev => ({ ...prev, dryingTime: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 168"
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Typical drying time is 120-240 hours (5-10 days)
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                <Button variant="outline" onClick={() => setCurrentStep(3)} className="w-full sm:w-auto">
                  <span className="text-xs sm:text-sm">Back</span>
                </Button>
                <Button 
                  onClick={() => setCurrentStep(5)}
                  className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto"
                >
                  <span className="text-xs sm:text-sm">Continue</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Payment */}
      {currentStep === 5 && selectedContest && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">{t('dashboard.sampleSubmission.payment.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.payment.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-sm sm:text-base">{t('dashboard.sampleSubmission.payment.summary.title')}</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>{t('dashboard.sampleSubmission.payment.summary.entryFee')}</span>
                    <span>${selectedContest.entryFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('dashboard.sampleSubmission.payment.summary.sampleFee')}</span>
                    <span>${selectedContest.sampleFee}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>{t('dashboard.sampleSubmission.payment.summary.total')}</span>
                    <span>${calculateTotalFee()}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.payment.method')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-2">
                  {[
                    { value: 'credit_card', label: t('dashboard.sampleSubmission.payment.methods.creditCard'), icon: CreditCard, img: visa },
                    { value: 'nequi', label: t('dashboard.sampleSubmission.payment.methods.nequi'), icon: DollarSign, img: nequi },
                    { value: 'paypal', label: t('dashboard.sampleSubmission.payment.methods.paypal'), icon: DollarSign, img: paypal }
                  ].map(({ value, label, icon: Icon, img }) => (
                    <div
                      key={value}
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        submission.paymentMethod === value 
                          ? 'border-[hsl(var(--chocolate-medium))] bg-[hsl(var(--chocolate-cream))]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSubmission(prev => ({ ...prev, paymentMethod: value as 'credit_card' | 'nequi' | 'paypal' }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="font-medium text-xs sm:text-sm">{label}</span>
                        </div>
                        <img src={img} alt={`${label} logo`} className="h-5 sm:h-6 w-auto object-contain" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {submission.paymentMethod === 'credit_card' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cardNumber" className="text-xs sm:text-sm">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="text-xs sm:text-sm" />
                    </div>
                    <div>
                      <Label htmlFor="cardName" className="text-xs sm:text-sm">Cardholder Name</Label>
                      <Input id="cardName" placeholder="John Doe" className="text-xs sm:text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-xs sm:text-sm">Expiry Date</Label>
                      <Input id="expiry" placeholder="MM/YY" className="text-xs sm:text-sm" />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-xs sm:text-sm">CVV</Label>
                      <Input id="cvv" placeholder="123" className="text-xs sm:text-sm" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={submission.agreedToTerms}
                  onCheckedChange={(checked) => setSubmission(prev => ({ ...prev, agreedToTerms: checked as boolean }))}
                />
                <Label htmlFor="terms" className="text-xs sm:text-sm">
                  {t('dashboard.sampleSubmission.payment.terms')}
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button variant="outline" onClick={() => setCurrentStep(4)} className="w-full sm:w-auto order-2 sm:order-1">
                  <span className="text-xs sm:text-sm">{t('dashboard.sampleSubmission.buttons.back')}</span>
                </Button>
                {submission.paymentMethod === 'paypal' ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2">
                    <div className="text-xs sm:text-sm text-muted-foreground">Total ${calculateTotalFee()}</div>
                    {/* Lazy PayPal mount: pay then submit */}
                    {/* @ts-ignore */}
                    <PayPalButtonsMount
                      amount={String(calculateTotalFee())}
                      disabled={!submission.agreedToTerms || isSubmitting}
                      onApproved={async ({ orderId, captureId }) => {
                        setIsSubmitting(true);
                        try {
                          // 1) Submit the sample (DB, QR, etc.) and capture the returned sample
                          const created = await handleSubmit();
                          const sampleId = created?.id;
                          if (!sampleId) throw new Error('Missing sample reference after submission');
                          // 2) Record payment securely via edge function
                          const { FinanceService } = await import('@/lib/financeService');
                          const cents = Math.round(Number(calculateTotalFee()) * 100);
                          const res = await FinanceService.recordParticipantPayment(sampleId, cents, 'USD', { orderId, captureId });
                          if (!res.success) throw new Error(res.error || 'Payment capture record failed');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    />
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">{t('dashboard.sampleSubmission.payment.paypalHint')}</Badge>
                  </div>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={!submission.agreedToTerms || isSubmitting}
                    className="bg-[hsl(var(--chocolate-medium))] hover:bg-[hsl(var(--chocolate-dark))] w-full sm:w-auto order-1 sm:order-2"
                  >
                    <span className="text-xs sm:text-sm">
                      {isSubmitting ? t('dashboard.sampleSubmission.payment.processing') : t('dashboard.sampleSubmission.payment.submit', { amount: calculateTotalFee() })}
                    </span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SampleSubmission;