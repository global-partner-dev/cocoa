import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Clock, CheckCircle, AlertTriangle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ContestParticipation {
  id: string;
  contestId: string;
  contestName: string;
  description: string;
  status: 'upcoming' | 'active' | 'completed';
  role: 'judge' | 'panel_lead';
  assignedDate: string;
  startDate: string;
  endDate: string;
  samplesAssigned: number;
  samplesCompleted: number;
  averageScore?: number;
  panelMembers?: string[];
  evaluationDeadline: string;
  contestType: 'international' | 'regional' | 'specialty';
}

interface JudgeStats {
  totalContests: number;
  activeContests: number;
  completedContests: number;
  totalSamplesEvaluated: number;
  averageScore: number;
  onTimeCompletionRate: number;
}

const mockContestParticipations: ContestParticipation[] = [
  {
    id: 'JP001',
    contestId: 'C001',
    contestName: 'International Cocoa Quality Competition 2024',
    description: 'Annual international competition evaluating cocoa quality from producers worldwide',
    status: 'active',
    role: 'judge',
    assignedDate: '2024-01-15',
    startDate: '2024-01-20',
    endDate: '2024-02-15',
    samplesAssigned: 12,
    samplesCompleted: 8,
    averageScore: 8.2,
    evaluationDeadline: '2024-01-30',
    contestType: 'international'
  },
  {
    id: 'JP002',
    contestId: 'C002',
    contestName: 'Regional Cocoa Excellence Awards 2024',
    description: 'Regional competition focusing on local cocoa varieties and traditional processing methods',
    status: 'active',
    role: 'panel_lead',
    assignedDate: '2024-01-10',
    startDate: '2024-01-25',
    endDate: '2024-02-20',
    samplesAssigned: 8,
    samplesCompleted: 8,
    averageScore: 7.8,
    panelMembers: ['Dr. Elena Martínez', 'Prof. Roberto Silva', 'Dr. Carmen Vega'],
    evaluationDeadline: '2024-02-10',
    contestType: 'regional'
  },
  {
    id: 'JP003',
    contestId: 'C003',
    contestName: 'Specialty Cocoa Innovation Challenge 2023',
    description: 'Competition for innovative cocoa processing techniques and unique flavor profiles',
    status: 'completed',
    role: 'judge',
    assignedDate: '2023-11-01',
    startDate: '2023-11-15',
    endDate: '2023-12-15',
    samplesAssigned: 15,
    samplesCompleted: 15,
    averageScore: 8.7,
    evaluationDeadline: '2023-12-01',
    contestType: 'specialty'
  },
  {
    id: 'JP004',
    contestId: 'C004',
    contestName: 'Young Producers Cocoa Competition 2024',
    description: 'Supporting young cocoa producers with quality evaluation and feedback',
    status: 'upcoming',
    role: 'judge',
    assignedDate: '2024-01-22',
    startDate: '2024-02-01',
    endDate: '2024-02-28',
    samplesAssigned: 10,
    samplesCompleted: 0,
    evaluationDeadline: '2024-02-20',
    contestType: 'specialty'
  }
];

const mockJudgeStats: JudgeStats = {
  totalContests: 12,
  activeContests: 2,
  completedContests: 9,
  totalSamplesEvaluated: 156,
  averageScore: 8.1,
  onTimeCompletionRate: 95
};

const JudgeContests = () => {
  const [participations, setParticipations] = useState<ContestParticipation[]>(mockContestParticipations);
  const [stats] = useState<JudgeStats>(mockJudgeStats);
  const [selectedContest, setSelectedContest] = useState<ContestParticipation | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const getStatusColor = (status: ContestParticipation['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ContestParticipation['status']) => {
    switch (status) {
      case 'upcoming': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'active': return <Clock className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getContestTypeColor = (type: ContestParticipation['contestType']) => {
    switch (type) {
      case 'international': return 'bg-purple-100 text-purple-800';
      case 'regional': return 'bg-orange-100 text-orange-800';
      case 'specialty': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: ContestParticipation['role']) => {
    return role === 'panel_lead' ? <Users className="w-4 h-4 text-blue-600" /> : <Trophy className="w-4 h-4 text-gray-600" />;
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAcceptContest = (contestId: string) => {
    toast({
      title: t('judgeContests.toasts.acceptedTitle'),
      description: t('judgeContests.toasts.acceptedDesc'),
    });
  };

  const handleDeclineContest = (contestId: string) => {
    toast({
      title: t('judgeContests.toasts.declinedTitle'),
      description: t('judgeContests.toasts.declinedDesc'),
      variant: "destructive"
    });
  };

  if (selectedContest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('judgeContests.details.title')}</h2>
            <p className="text-muted-foreground">{selectedContest.contestName}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedContest(null)}
          >
            {t('judgeContests.details.back')}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Contest Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('judgeContests.details.infoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.contestName')}</label>
                <p className="font-semibold text-[hsl(var(--chocolate-dark))]">
                  {selectedContest.contestName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.description')}</label>
                <p className="text-sm">{selectedContest.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.type')}</label>
                <Badge className={getContestTypeColor(selectedContest.contestType)}>
                  {t(`judgeContests.types.${selectedContest.contestType}`)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.yourRole')}</label>
                <div className="flex items-center space-x-2 mt-1">
                  {getRoleIcon(selectedContest.role)}
                  <span className="font-medium">
                    {t(`judgeContests.details.roleLabel.${selectedContest.role}`)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.status')}</label>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon(selectedContest.status)}
                  <Badge className={getStatusColor(selectedContest.status)}>
                    {t(`judgeContests.status.${selectedContest.status}`)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t('judgeContests.details.timelineTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.assignmentDate')}</label>
                <p className="text-sm">{selectedContest.assignedDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.contestPeriod')}</label>
                <p className="text-sm">
                  {selectedContest.startDate} - {selectedContest.endDate}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.evaluationDeadline')}</label>
                <p className={`text-sm font-medium ${
                  getDaysUntilDeadline(selectedContest.evaluationDeadline) <= 3 
                    ? 'text-red-600' 
                    : 'text-gray-900'
                }`}>
                  {selectedContest.evaluationDeadline}
                  {selectedContest.status === 'active' && (
                    <span className="ml-2 text-xs">
                      {t('judgeContests.details.daysLeft', { days: getDaysUntilDeadline(selectedContest.evaluationDeadline) })}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.sampleProgress')}</label>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('judgeContests.details.samplesProgress', { completed: selectedContest.samplesCompleted, assigned: selectedContest.samplesAssigned })}</span>
                    <span>{Math.round((selectedContest.samplesCompleted / selectedContest.samplesAssigned) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(selectedContest.samplesCompleted / selectedContest.samplesAssigned) * 100} 
                  />
                </div>
              </div>
              {selectedContest.averageScore && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.fields.averageScore')}</label>
                  <p className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
                    {selectedContest.averageScore.toFixed(1)}/10
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedContest.role === 'panel_lead' ? t('judgeContests.details.panelTitleLead') : t('judgeContests.details.panelTitleJudge')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedContest.role === 'panel_lead' && selectedContest.panelMembers && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.panelMembers')}</label>
                  <div className="mt-2 space-y-2">
                    {selectedContest.panelMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{member}</span>
                        <Badge variant="outline" className="text-xs">{t('judgeContests.details.judgeBadge')}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('judgeContests.details.guidelinesTitle')}</label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{t('judgeContests.details.guidelines.anonymous')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{t('judgeContests.details.guidelines.standard')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{t('judgeContests.details.guidelines.notes')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>{t('judgeContests.details.guidelines.deadline')}</span>
                  </div>
                </div>
              </div>

              {selectedContest.status === 'upcoming' && (
                <div className="pt-4 space-y-2">
                  <Button 
                    onClick={() => handleAcceptContest(selectedContest.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {t('judgeContests.details.actions.accept')}
                  </Button>
                  <Button 
                    onClick={() => handleDeclineContest(selectedContest.id)}
                    variant="outline"
                    className="w-full"
                  >
                    {t('judgeContests.details.actions.decline')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('judgeContests.header.title')}</h2>
          <p className="text-muted-foreground">{t('judgeContests.header.subtitle')}</p>
        </div>
      </div>

      {/* Judge Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[hsl(var(--chocolate-dark))]">
              {stats.totalContests}
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.totalContests')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.activeContests}
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {stats.completedContests}
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.completed')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalSamplesEvaluated}
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.samplesEvaluated')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.averageScore.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.avgScore')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.onTimeCompletionRate}%
            </div>
            <p className="text-sm text-muted-foreground">{t('judgeContests.list.stats.onTimeRate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contest Participations */}
      <Card>
        <CardHeader>
          <CardTitle>{t('judgeContests.list.assignmentsTitle')}</CardTitle>
          <CardDescription>{t('judgeContests.list.assignmentsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {participations.map((participation) => (
              <div
                key={participation.id}
                className="p-4 border rounded-lg hover:shadow-[var(--shadow-chocolate)] transition-[var(--transition-smooth)] cursor-pointer"
                onClick={() => setSelectedContest(participation)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(participation.status)}
                    <div>
                      <h3 className="font-semibold text-[hsl(var(--chocolate-dark))]">
                        {participation.contestName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {participation.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          {getRoleIcon(participation.role)}
                          <span className="text-xs text-muted-foreground">
                            {participation.role === 'panel_lead' ? t('judgeContests.list.roleShort.panel_lead') : t('judgeContests.list.roleShort.judge')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {participation.startDate} - {participation.endDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getContestTypeColor(participation.contestType)}>
                          {t(`judgeContests.types.${participation.contestType}`)}
                        </Badge>
                        <Badge className={getStatusColor(participation.status)}>
                          {t(`judgeContests.status.${participation.status}`)}
                        </Badge>
                      </div>
                      {participation.status === 'active' && 
                       getDaysUntilDeadline(participation.evaluationDeadline) <= 3 && (
                        <div className="text-xs text-red-600 font-medium">
                          {t('judgeContests.list.dueInDays', { days: getDaysUntilDeadline(participation.evaluationDeadline) })}
                        </div>
                      )}
                    </div>
                    <div className="w-32">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('judgeContests.list.samplesLabel', { completed: participation.samplesCompleted, assigned: participation.samplesAssigned })}
                      </div>
                      <Progress 
                        value={(participation.samplesCompleted / participation.samplesAssigned) * 100} 
                        className="h-2"
                      />
                    </div>
                    {participation.averageScore && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-[hsl(var(--chocolate-dark))]">
                          {participation.averageScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('judgeContests.list.avgScoreShort')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgeContests;