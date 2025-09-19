import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, Package, Calendar, User, Trophy } from 'lucide-react';
import { SamplesService, Sample } from '@/lib/samplesService';

const QRVerification = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const { t } = useTranslation();
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSample = async () => {
      if (!trackingCode) {
        setError(t('pages.qrVerification.invalidTrackingCode'));
        setLoading(false);
        return;
      }

      try {
        const sampleData = await SamplesService.getSampleByTrackingCode(trackingCode);
        setSample(sampleData);
      } catch (err) {
        console.error('Error fetching sample:', err);
        setError(t('pages.qrVerification.invalidTrackingCode'));
      } finally {
        setLoading(false);
      }
    };

    fetchSample();
  }, [trackingCode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'evaluated': return 'bg-purple-100 text-purple-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return t(`pages.qrVerification.status.${status}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'evaluated':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'disqualified':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('pages.qrVerification.verifying')}</p>
        </div>
      </div>
    );
  }

  if (error || !sample) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.qrVerification.sampleNotFound')}</h2>
              <p className="text-gray-600 mb-4">
                {error || t('pages.qrVerification.invalidTrackingCode')}
              </p>
              <p className="text-sm text-gray-500">
                {t('pages.qrVerification.trackingCode')}: <span className="font-mono">{trackingCode}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {getStatusIcon(sample.status)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('pages.qrVerification.title')}</h1>
          <p className="text-gray-600">{t('pages.qrVerification.subtitle')}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('pages.qrVerification.sampleInformation')}</span>
              <Badge className={getStatusColor(sample.status)}>
                {getStatusText(sample.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.trackingCode')}</label>
                <p className="font-mono text-lg font-semibold">{sample.tracking_code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.submissionDate')}</label>
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(sample.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.contest')}</label>
              <p className="flex items-center text-lg">
                <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                {t('pages.qrVerification.contestId')}: {sample.contest_id}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.owner')}</label>
                <p className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {sample.owner_full_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.farm')}</label>
                <p>{sample.farm_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.country')}</label>
                <p>{sample.country}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.quantity')}</label>
                <p>{sample.quantity} kg</p>
              </div>
            </div>

            {sample.variety && (
              <div>
                <label className="text-sm font-medium text-gray-500">{t('pages.qrVerification.variety')}</label>
                <p>{sample.variety}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('pages.qrVerification.verificationStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">{t('pages.qrVerification.verifiedSample')}</p>
                <p className="text-sm text-gray-600">
                  {t('pages.qrVerification.verifiedDescription')}
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{t('pages.qrVerification.note')}</strong> {t('pages.qrVerification.noteDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRVerification;