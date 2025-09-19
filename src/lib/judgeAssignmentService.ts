import { supabase } from './supabase';

export interface UISample {
  id: string;
  internalCode: string;
  participantName: string;
  contestName: string;
  status: 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated';
  assignedJudges?: string[];
  hasEvaluating?: boolean; // true if any assignment for this sample has status 'evaluating'
  evaluationProgress?: number;
}

export interface UIJudge {
  id: string;
  name: string;
  email: string;
  specialization?: string;
  currentAssignments: number;
  maxAssignments: number;
  available: boolean;
}

export interface JudgeAssignedSample {
  id: string;
  internalCode: string;
  contestName: string;
  assignedDate: string; // ISO date
  deadline: string;     // ISO date (contest end date)
  status: 'pending' | 'in_progress' | 'completed';
  evaluationProgress?: number;
}

export interface JudgeActiveContest {
  id: string;
  name: string;
  status: 'active' | 'completed';
  samplesAssigned: number;
  samplesCompleted: number;
  deadline: string; // ISO end date
}

export class JudgeAssignmentService {
  static generateInternalCode(createdAt: string, id: string) {
    const y = createdAt?.slice(2, 4) || '00';
    return `INT-${y}-${id.slice(0, 4).toUpperCase()}`;
  }

  static async getSamplesForAssignment(): Promise<UISample[]> {
    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        contests:contest_id ( name ),
        profiles:user_id ( name )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const sampleIds = (data ?? []).map(s => s.id);

    let assignsBySample = new Map<string, string[]>();
    let evaluatingBySample = new Map<string, boolean>();
    if (sampleIds.length > 0) {
      const { data: assigns, error: aerr } = await supabase
        .from('judge_assignments')
        .select('sample_id, judge_id, status')
        .in('sample_id', sampleIds);
      if (aerr) throw aerr;
      (assigns ?? []).forEach(a => {
        const arr = assignsBySample.get(a.sample_id) ?? [];
        arr.push(a.judge_id);
        assignsBySample.set(a.sample_id, arr);
        if (a.status === 'evaluating') evaluatingBySample.set(a.sample_id, true);
      });
    }

    return (data ?? []).map((s: any) => ({
      id: s.id,
      internalCode: this.generateInternalCode(s.created_at, s.id),
      participantName: s.profiles?.name || s.owner_full_name || 'Unknown',
      contestName: s.contests?.name || 'Unknown Contest',
      status: s.status,
      assignedJudges: assignsBySample.get(s.id) ?? [],
      hasEvaluating: evaluatingBySample.get(s.id) ?? false,
    }));
  }

  static async getAvailableJudges(maxAssignmentsPerJudge = 10): Promise<UIJudge[]> {
    const { data: judges, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'judge')
      .eq('is_verified', true);
    if (error) throw error;

    const judgeIds = (judges ?? []).map(j => j.id);
    let countMap = new Map<string, number>();
    if (judgeIds.length > 0) {
      const { data: counts, error: cerr } = await supabase
        .from('judge_assignments')
        .select('judge_id, status')
        .in('judge_id', judgeIds);
      if (cerr) throw cerr;
      (counts ?? []).forEach(c => {
        const cur = countMap.get(c.judge_id) ?? 0;
        const add = c.status === 'completed' ? 0 : 1;
        countMap.set(c.judge_id, cur + add);
      });
    }

    return (judges ?? []).map(j => {
      const current = countMap.get(j.id) ?? 0;
      const max = maxAssignmentsPerJudge;
      return {
        id: j.id,
        name: j.name,
        email: j.email,
        currentAssignments: current,
        maxAssignments: max,
        available: current < max,
      };
    });
  }

  static async assignJudgesToSample(sampleId: string, judgeIds: string[]): Promise<void> {
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error('Not authenticated');
    if (judgeIds.length === 0) return;

    const rows = judgeIds.map(judgeId => ({
      sample_id: sampleId,
      judge_id: judgeId,
      assigned_by: user.id,
      status: 'assigned' as const,
    }));

    const { error } = await supabase
      .from('judge_assignments')
      .upsert(rows, { onConflict: 'sample_id,judge_id' });

    if (error) throw error;
  }

  static async bulkAssign(sampleIds: string[], judgeIds: string[]): Promise<void> {
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error('Not authenticated');
    if (sampleIds.length === 0 || judgeIds.length === 0) return;

    const rows = sampleIds.flatMap(sid =>
      judgeIds.map(jid => ({
        sample_id: sid,
        judge_id: jid,
        assigned_by: user.id,
        status: 'assigned' as const,
      }))
    );

    const { error } = await supabase
      .from('judge_assignments')
      .upsert(rows, { onConflict: 'sample_id,judge_id' });

    if (error) throw error;
  }

  static async unassign(sampleId: string, judgeId: string): Promise<void> {
    const { error } = await supabase
      .from('judge_assignments')
      .delete()
      .eq('sample_id', sampleId)
      .eq('judge_id', judgeId);
    if (error) throw error;
  }

  // Fetch samples assigned to the current judge (for Judge Dashboard)
  static async getAssignedSamplesForJudge(): Promise<JudgeAssignedSample[]> {
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error('Not authenticated');

    // 1) Get assignments for this judge
    const { data: assigns, error: aerr } = await supabase
      .from('judge_assignments')
      .select('sample_id, status, assigned_at')
      .eq('judge_id', user.id);
    if (aerr) throw aerr;

    if (!assigns || assigns.length === 0) return [];

    const sampleIds = assigns.map(a => a.sample_id);

    // 2) Fetch samples + contest relation
    const { data: samples, error: serr } = await supabase
      .from('samples')
      .select('id, created_at, contest_id, contests:contest_id ( name, end_date )')
      .in('id', sampleIds);
    if (serr) throw serr;

    // 3) Optionally compute evaluation progress from another table when available
    // Placeholder progress: pending=0, in_progress=60, completed=100
    const statusToProgress = (s: string) => s === 'completed' ? 100 : s === 'evaluating' ? 60 : 0;

    const assignBySample = new Map<string, { status: string; assigned_at: string }>();
    assigns.forEach(a => assignBySample.set(a.sample_id, { status: a.status, assigned_at: a.assigned_at } as any));

    return (samples ?? []).map(s => {
      const a = assignBySample.get(s.id)!;
      const internal = this.generateInternalCode(s.created_at, s.id);
      const deadline = (s as any).contests?.end_date || new Date().toISOString();
      // map status variants
      const rawStatus = (a?.status || 'assigned') as 'assigned' | 'evaluating' | 'completed';
      const mappedStatus: 'pending' | 'in_progress' | 'completed' =
        rawStatus === 'completed' ? 'completed' : rawStatus === 'evaluating' ? 'in_progress' : 'pending';

      return {
        id: s.id,
        internalCode: internal,
        contestName: (s as any).contests?.name || 'Unknown Contest',
        assignedDate: (a?.assigned_at ?? s.created_at).split('T')[0],
        deadline: String(deadline).split('T')[0],
        status: mappedStatus,
        evaluationProgress: statusToProgress(rawStatus),
      } as JudgeAssignedSample;
    });
  }

  // Fetch active contests for this judge with simple progress counts
  static async getActiveContestsForJudge(): Promise<JudgeActiveContest[]> {
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw new Error('Not authenticated');

    // Get all assignments for current judge
    const { data: assigns, error: aerr } = await supabase
      .from('judge_assignments')
      .select('sample_id, status')
      .eq('judge_id', user.id);
    if (aerr) throw aerr;
    if (!assigns || assigns.length === 0) return [];

    const sampleIds = assigns.map(a => a.sample_id);

    // Fetch samples with their contests
    const { data: samples, error: serr } = await supabase
      .from('samples')
      .select('id, contest_id, contests:contest_id ( id, name, end_date )')
      .in('id', sampleIds);
    if (serr) throw serr;

    // Aggregate by contest
    const byContest = new Map<string, { name: string; end_date: string; assigned: number; completed: number }>();
    (assigns ?? []).forEach(a => {
      const s = (samples ?? []).find(x => x.id === a.sample_id);
      if (!s) return;
      const c = (s as any).contests;
      if (!c) return;
      const key = c.id;
      const prev = byContest.get(key) || { name: c.name, end_date: c.end_date, assigned: 0, completed: 0 };
      prev.assigned += 1;
      if (a.status === 'completed') prev.completed += 1;
      byContest.set(key, prev);
    });

    const today = new Date();
    const contests: JudgeActiveContest[] = [];
    byContest.forEach((v, id) => {
      const isActive = new Date(v.end_date) >= today; // simple heuristic
      contests.push({
        id,
        name: v.name,
        status: isActive ? 'active' : 'completed',
        samplesAssigned: v.assigned,
        samplesCompleted: v.completed,
        deadline: String(v.end_date).split('T')[0],
      });
    });

    return contests;
  }
}