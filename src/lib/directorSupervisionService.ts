import { supabase } from './supabase';

export type SampleStatus = 'assigned' | 'evaluating' | 'evaluated';
export type JudgeAssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface DirectorJudgeAssignment {
  judgeId: string;
  judgeName: string;
  status: JudgeAssignmentStatus;
  score?: number;
  evaluatedAt?: string; // ISO date
}

export interface DirectorSampleEvaluation {
  id: string; // sample id
  internalCode: string;
  trackingCode: string;
  participantName: string;
  contestName: string;
  evaluationDeadline?: string; // contest end_date
  status: SampleStatus;
  overallProgress: number; // 0-100
  averageScore?: number; // avg of judge overall_quality
  assignedJudges: DirectorJudgeAssignment[];
}

export interface DirectorJudgeKpi {
  id: string;
  name: string;
  email: string;
  totalAssignments: number;
  completedEvaluations: number;
  averageScore: number; // across completed sensory evaluations
  efficiency: number; // completed/total * 100
}

export class DirectorSupervisionService {
  static generateInternalCode(createdAt: string, id: string) {
    const y = createdAt?.slice(2, 4) || '00';
    return `INT-${y}-${id.slice(0, 4).toUpperCase()}`;
  }

  /**
   * Fetch aggregated supervision overview for director
   * - Determines completion from sensory_evaluations presence
   * - Uses samples.status as authoritative when 'evaluated'
   */
  static async getEvaluationOverview(): Promise<{ samples: DirectorSampleEvaluation[]; judges: DirectorJudgeKpi[]; }> {
    // 1) Load all judge assignments with essential fields
    const { data: assignments, error: aerr } = await supabase
      .from('judge_assignments')
      .select('sample_id, judge_id, status, assigned_at');
    if (aerr) throw aerr;

    if (!assignments || assignments.length === 0) {
      return { samples: [], judges: [] };
    }

    const sampleIds = Array.from(new Set(assignments.map(a => a.sample_id)));
    const judgeIds = Array.from(new Set(assignments.map(a => a.judge_id)));

    // 2) Fetch samples with contest and participant
    const { data: samples, error: serr } = await supabase
      .from('sample')
      .select('id, tracking_code, status, created_at, contests:contest_id ( name, end_date ), profiles:user_id ( name )')
      .in('id', sampleIds);
    if (serr) throw serr;

    // 3) Fetch judge profiles for names
    const { data: judgeProfiles, error: jerr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', judgeIds);
    if (jerr) throw jerr;

    const judgeNameById = new Map<string, { name: string; email: string }>();
    (judgeProfiles ?? []).forEach(j => judgeNameById.set(j.id, { name: j.name, email: j.email }));

    // 4) Fetch sensory evaluations for these sample-judge pairs
    const { data: evals, error: eerr } = await supabase
      .from('sensory_evaluations')
      .select('sample_id, judge_id, overall_quality, evaluation_date')
      .in('sample_id', sampleIds)
      .in('judge_id', judgeIds);
    if (eerr) throw eerr;

    // Index evaluations by (sample:judge)
    const evalByKey = new Map<string, { score?: number; date?: string }>();
    (evals ?? []).forEach(e => {
      const key = `${e.sample_id}:${e.judge_id}`;
      evalByKey.set(key, { score: e.overall_quality ?? undefined, date: e.evaluation_date ?? undefined });
    });

    // Group assignments by sample
    const bySample = new Map<string, typeof assignments>();
    assignments.forEach(a => {
      const arr = bySample.get(a.sample_id) ?? ([] as typeof assignments);
      (arr as any).push(a);
      bySample.set(a.sample_id, arr);
    });

    // Build sample evaluations
    const directorSamples: DirectorSampleEvaluation[] = (samples ?? []).map((s: any) => {
      const contest = s.contests;
      const participant = s.profiles;
      const internalCode = this.generateInternalCode(s.created_at, s.id);
      const sampleAssignments = bySample.get(s.id) ?? [];

      // Judge UI status derived from evaluation presence first
      const judgeItems: DirectorJudgeAssignment[] = sampleAssignments.map((a: any) => {
        const key = `${a.sample_id}:${a.judge_id}`;
        const ev = evalByKey.get(key);
        const profile = judgeNameById.get(a.judge_id);
        const hasEval = typeof ev?.score === 'number' || !!ev?.date; // any saved eval counts as completed
        const mapped: JudgeAssignmentStatus = hasEval
          ? 'completed'
          : a.status === 'evaluating'
            ? 'in_progress'
            : 'pending';
        // Scale score from 0-10 to 0-100 for UI consistency
        const scaledScore = typeof ev?.score === 'number' ? Number(ev.score) * 10 : undefined;
        return {
          judgeId: a.judge_id,
          judgeName: profile?.name || a.judge_id,
          status: mapped,
          score: scaledScore,
          evaluatedAt: ev?.date ? String(ev.date).split('T')[0] : undefined,
        } as DirectorJudgeAssignment;
      });

      const total = judgeItems.length || 1;
      const completed = judgeItems.filter(j => j.status === 'completed').length;
      const overallProgress = Math.round((completed / total) * 100);

      // Average score from existing evaluations only (already scaled to 0-100)
      const scores = judgeItems.map(j => j.score).filter((v): v is number => typeof v === 'number');
      const averageScore = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : undefined;

      // Sample-level status: honor DB 'evaluated' first, else infer from evals/assignments
      let status: SampleStatus;
      if (s.status === 'evaluated') {
        status = 'evaluated';
      } else if (completed === total && total > 0) {
        status = 'evaluated';
      } else if (completed > 0 || judgeItems.some(j => j.status === 'in_progress')) {
        status = 'evaluating';
      } else {
        status = 'assigned';
      }

      return {
        id: s.id,
        internalCode,
        trackingCode: s.tracking_code,
        participantName: participant?.name || 'Unknown',
        contestName: contest?.name || 'Unknown Contest',
        evaluationDeadline: contest?.end_date ? String(contest.end_date).split('T')[0] : undefined,
        status,
        overallProgress,
        averageScore,
        assignedJudges: judgeItems,
      } as DirectorSampleEvaluation;
    });

    // Build judge KPIs using evaluations to detect completion
    const byJudgeAgg = new Map<string, { name: string; email: string; total: number; completed: number; scores: number[] }>();

    // Seed totals from assignments
    assignments.forEach(a => {
      const jp = judgeNameById.get(a.judge_id);
      const rec = byJudgeAgg.get(a.judge_id) || { name: jp?.name || a.judge_id, email: jp?.email || '', total: 0, completed: 0, scores: [] };
      rec.total += 1;
      byJudgeAgg.set(a.judge_id, rec);
    });

    // Add completions and scores from evals
    (evals ?? []).forEach(e => {
      const jp = judgeNameById.get(e.judge_id);
      const rec = byJudgeAgg.get(e.judge_id) || { name: jp?.name || e.judge_id, email: jp?.email || '', total: 0, completed: 0, scores: [] };
      rec.completed += 1;
      if (typeof e.overall_quality === 'number') rec.scores.push(Number(e.overall_quality) * 10); // scale to 0-100
      byJudgeAgg.set(e.judge_id, rec);
    });

    const judges: DirectorJudgeKpi[] = [];
    byJudgeAgg.forEach((v, id) => {
      const avg = v.scores.length ? Number((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(2)) : 0;
      const eff = v.total ? Math.round((v.completed / v.total) * 100) : 0;
      judges.push({ id, name: v.name, email: v.email, totalAssignments: v.total, completedEvaluations: v.completed, averageScore: avg, efficiency: eff });
    });

    return { samples: directorSamples, judges };
  }
}