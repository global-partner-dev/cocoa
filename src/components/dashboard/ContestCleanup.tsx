import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ContestsService } from '@/lib/contestsService';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * ContestCleanup Component
 * 
 * Admin-only utility for cleaning up expired contests and their associated data.
 * This component should only be visible to users with admin role.
 */
const ContestCleanup = () => {
  const { t } = useTranslation();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      await ContestsService.cleanupExpiredContests();
      
      setLastCleanup(new Date());
      toast({
        title: t('contestCleanup.success.title', 'Cleanup Successful'),
        description: t('contestCleanup.success.description', 'Expired contests and their data have been removed.'),
      });
    } catch (error) {
      console.error('Error cleaning up contests:', error);
      toast({
        title: t('contestCleanup.error.title', 'Cleanup Failed'),
        description: error instanceof Error 
          ? error.message 
          : t('contestCleanup.error.description', 'Failed to cleanup expired contests. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-amber-900">
              {t('contestCleanup.title', 'Contest Data Cleanup')}
            </CardTitle>
            <CardDescription className="text-amber-700">
              {t('contestCleanup.description', 'Remove expired contests and their associated data (samples, rankings, evaluations)')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <h4 className="font-semibold text-sm text-amber-900 mb-2">
            {t('contestCleanup.whatHappens.title', 'What happens during cleanup?')}
          </h4>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>{t('contestCleanup.whatHappens.item1', 'Contests with end_date in the past are identified')}</li>
            <li>{t('contestCleanup.whatHappens.item2', 'All samples associated with expired contests are deleted')}</li>
            <li>{t('contestCleanup.whatHappens.item3', 'All rankings for expired contests are removed')}</li>
            <li>{t('contestCleanup.whatHappens.item4', 'The expired contest records are deleted')}</li>
          </ul>
        </div>

        {lastCleanup && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="w-4 h-4" />
            <span>
              {t('contestCleanup.lastCleanup', 'Last cleanup: {{date}}', {
                date: lastCleanup.toLocaleString()
              })}
            </span>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('contestCleanup.cleaning', 'Cleaning up...')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('contestCleanup.button', 'Cleanup Expired Contests')}
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('contestCleanup.confirm.title', 'Are you sure?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('contestCleanup.confirm.description', 
                  'This action will permanently delete all expired contests and their associated data. This cannot be undone.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('contestCleanup.confirm.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCleanup}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('contestCleanup.confirm.confirm', 'Yes, cleanup expired contests')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-xs text-amber-700 text-center">
          {t('contestCleanup.adminOnly', 'This action is only available to administrators')}
        </p>
      </CardContent>
    </Card>
  );
};

export default ContestCleanup;