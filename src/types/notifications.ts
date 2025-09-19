export type NotificationType =
  | 'user_registered'
  | 'sample_added'
  | 'sample_received'
  | 'sample_disqualified'
  | 'sample_approved'
  | 'sample_assigned_to_judge'
  | 'judge_evaluated_sample'
  | 'evaluator_evaluated_sample'
  | 'contest_created'
  | 'contest_completed'
  | 'contest_final_stage'
  | 'final_ranking_top3';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DbNotificationRow {
  id: string;
  recipient_user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  details: string | null;
  related_sample_id: string | null;
  related_contest_id: string | null;
  related_user_id: string | null;
  action_required: boolean;
  expires_at: string | null;
  read: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}