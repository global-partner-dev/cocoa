import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, DollarSign, Plus, Edit, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ContestsService, type ContestDisplay } from "@/lib/contestsService";
import { usePermissions } from "@/hooks/usePermissions";
import { validateDateRange, getTodayString, getStatusColorClass } from "@/lib/dateUtils";
import { useTranslation } from 'react-i18next';

const ContestManagement = () => {
  const { canManageContests, loading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();
  const [contests, setContests] = useState<ContestDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<ContestDisplay | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    samplePrice: 0,
    evaluationPrice: 0,
    finalEvaluation: false,
  });

  // Load contests on component mount
  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    try {
      setLoading(true);
      // Use getDirectorContests which automatically handles admin vs director filtering
      const contestsData = await ContestsService.getDirectorContests();
      setContests(contestsData);
    } catch (error) {
      console.error('Error loading contests:', error);
      toast({
        title: t('contest.toasts.error'),
        description: t('contest.toasts.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date range
    if (!validateDateRange(formData.startDate, formData.endDate)) {
      toast({
        title: t('contest.validation.invalidDateTitle'),
        description: t('contest.validation.invalidDateDesc'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (editingContest) {
        // Update existing contest
        const updatedContest = await ContestsService.updateContest(editingContest.id, formData);
        setContests(contests.map(c => c.id === editingContest.id ? updatedContest : c));
        toast({
          title: t('contest.toasts.success'),
          description: t('contest.toasts.updated'),
        });
      } else {
        // Create new contest (status will be calculated automatically)
        const newContest = await ContestsService.createContest(formData);
        setContests([newContest, ...contests]);
        toast({
          title: t('contest.toasts.success'),
          description: t('contest.toasts.created'),
        });
      }

      setFormData({ name: '', description: '', location: '', startDate: '', endDate: '', samplePrice: 0, evaluationPrice: 0, finalEvaluation: false });
      setEditingContest(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving contest:', error);
      toast({
        title: t('contest.toasts.error'),
        description: error instanceof Error ? error.message : t('contest.toasts.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const editContest = (contest: ContestDisplay) => {
    setEditingContest(contest);
    setFormData({
      name: contest.name,
      description: contest.description,
      location: contest.location,
      startDate: contest.startDate,
      endDate: contest.endDate,
      samplePrice: contest.samplePrice,
      evaluationPrice: (contest as any).evaluationPrice ?? 0,
      finalEvaluation: (contest as any).finalEvaluation ?? false,
    });
    setIsDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingContest(null);
    setFormData({ name: '', description: '', location: '', startDate: '', endDate: '', samplePrice: 0, evaluationPrice: 0, finalEvaluation: false });
    setIsDialogOpen(false);
  };

  const deleteContest = async (id: string) => {
    try {
      await ContestsService.deleteContest(id);
      setContests(contests.filter(contest => contest.id !== id));
      toast({
        title: t('contest.toasts.success'),
        description: t('contest.toasts.deleted'),
      });
    } catch (error) {
      console.error('Error deleting contest:', error);
      toast({
        title: t('contest.toasts.error'),
        description: error instanceof Error ? error.message : t('contest.toasts.deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  // Use the utility function for status colors
  const getStatusColor = getStatusColorClass;

  // Show loading state
  if (loading || permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('contest.title')}</h2>
            <p className="text-muted-foreground">{t('contest.subtitle')}</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--chocolate-medium))]" />
          <span className="ml-2 text-muted-foreground">{t('contest.loading')}</span>
        </div>
      </div>
    );
  }

  // Show permission denied message
  if (!canManageContests) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('contest.title')}</h2>
            <p className="text-muted-foreground">{t('contest.subtitle')}</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('contest.accessRestrictedTitle')}</h3>
            <p className="text-muted-foreground">
              {t('contest.accessRestrictedDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('contest.title')}</h2>
          <p className="text-muted-foreground">{t('contest.subtitle')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="chocolate" className="flex items-center space-x-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              <span>{t('contest.create')}</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContest ? t('contest.edit') : t('contest.createNew')}</DialogTitle>
              <DialogDescription>
                {editingContest ? t('contest.updateDetails') : t('contest.createDetails')}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('contest.fields.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('contest.fields.namePh')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('contest.fields.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('contest.fields.descriptionPh')}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('contest.fields.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={t('contest.fields.locationPh')}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('contest.fields.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={editingContest ? undefined : getTodayString()}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('contest.fields.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate || getTodayString()}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="samplePrice">{t('contest.fields.samplePrice')}</Label>
                <Input
                  id="samplePrice"
                  type="number"
                  value={formData.samplePrice}
                  onChange={(e) => setFormData({ ...formData, samplePrice: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluationPrice">{t('contest.fields.evaluationPrice')}</Label>
                <Input
                  id="evaluationPrice"
                  type="number"
                  value={formData.evaluationPrice}
                  onChange={(e) => setFormData({ ...formData, evaluationPrice: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={submitting} className="w-full sm:w-auto">
                  {t('contest.buttons.cancel')}
                </Button>
                <Button type="submit" variant="chocolate" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {editingContest ? t('contest.buttons.updating') : t('contest.buttons.creating')}
                    </>
                  ) : (
                    editingContest ? t('contest.buttons.update') : t('contest.buttons.create')
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {contests.map((contest) => (
          <Card key={contest.id} className="hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)]">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-[hsl(var(--chocolate-dark))] text-lg sm:text-xl">{contest.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">{contest.description}</p>
                  
                  {/* Contest details - responsive grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{contest.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{contest.startDate} - {contest.endDate}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span>Sample Price:${contest.samplePrice}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{t('contest.badges.evalAbbrev')}</span>
                      <span>${(contest as any).evaluationPrice ?? 0}</span>
                    </div>
                  </div>
                </div>
                
                {/* Status and actions - responsive layout */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 lg:gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(contest.status)} self-start sm:self-auto`}>
                    {contest.status}
                  </span>
                  
                  {/* Final evaluation button/badge */}
                  <div className="flex flex-wrap gap-2">
                    {contest.status === 'active' && !contest.finalEvaluation && (
                      <Button
                        variant="chocolate"
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = await ContestsService.startFinalEvaluation(contest.id);
                            setContests((prev) => prev.map((c) => (c.id === contest.id ? updated : c)));
                            toast({ title: t('contest.toasts.finalStarted') });
                          } catch (e: any) {
                            toast({ title: t('contest.toasts.actionFailed'), description: e?.message || t('contest.toasts.couldNotStartFinal'), variant: 'destructive' });
                          }
                        }}
                        className="text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">{t('contest.buttons.startFinalEval')}</span>
                        <span className="sm:hidden">Start Final</span>
                      </Button>
                    )}
                    {contest.status === 'active' && contest.finalEvaluation && (
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {t('contest.badges.startedFinalEval')}
                      </span>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => editContest(contest)} title={t('contest.buttons.edit')}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteContest(contest.id)}
                      className="text-red-600 hover:text-red-700"
                      title={t('contest.buttons.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {contests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">{t('contest.empty')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContestManagement;