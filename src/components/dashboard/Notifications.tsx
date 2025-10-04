import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markAsRead, markAsUnread, deleteNotification, notificationPrettyType } from "@/lib/notificationsService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { DbNotificationRow, NotificationPriority, NotificationType } from "@/types/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Bell, AlertTriangle, TrendingUp, CheckCircle, Check, Trash2, Mail, Info, Award, FileText, UserPlus, Package, Gavel } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// Parse reasons appended after the last colon and return base message + list
const parseDisqualificationMessage = (message: string): { base: string; reasons: string[] } => {
  const idx = message.lastIndexOf(":");
  if (idx === -1) {
    return { base: message, reasons: [] };
  }
  const baseRaw = message.slice(0, idx).trim();
  const base = baseRaw.endsWith(".") ? baseRaw : `${baseRaw}.`;
  const reasons = message
    .slice(idx + 1)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  return { base, reasons };
};

const typeToBadge = (type: NotificationType) => {
  switch (type) {
    case 'sample_received': return 'bg-blue-100 text-blue-800';
    case 'sample_disqualified': return 'bg-red-100 text-red-800';
    case 'sample_approved': return 'bg-green-100 text-green-800';
    case 'sample_assigned_to_judge': return 'bg-yellow-100 text-yellow-800';
    case 'judge_evaluated_sample': return 'bg-purple-100 text-purple-800';
    case 'evaluator_evaluated_sample': return 'bg-purple-100 text-purple-800';
    case 'contest_created': return 'bg-orange-100 text-orange-800';
    case 'contest_completed': return 'bg-orange-100 text-orange-800';
    case 'contest_final_stage': return 'bg-orange-100 text-orange-800';
    case 'final_ranking_top3': return 'bg-yellow-100 text-yellow-800';
    case 'sample_added': return 'bg-sky-100 text-sky-800';
    case 'user_registered': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const priorityToBadge = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const typeToIcon = (type: NotificationType) => {
  switch (type) {
    case 'sample_received': return <Package className="w-4 h-4 text-blue-600" />;
    case 'sample_disqualified': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    case 'sample_approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'sample_assigned_to_judge': return <Gavel className="w-4 h-4 text-yellow-600" />;
    case 'judge_evaluated_sample': return <TrendingUp className="w-4 h-4 text-purple-600" />;
    case 'evaluator_evaluated_sample': return <TrendingUp className="w-4 h-4 text-purple-600" />;
    case 'contest_created': return <FileText className="w-4 h-4 text-orange-600" />;
    case 'contest_completed': return <FileText className="w-4 h-4 text-orange-600" />;
    case 'contest_final_stage': return <Award className="w-4 h-4 text-yellow-600" />;
    case 'final_ranking_top3': return <Award className="w-4 h-4 text-yellow-600" />;
    case 'sample_added': return <UserPlus className="w-4 h-4 text-sky-600" />;
    case 'user_registered': return <Info className="w-4 h-4 text-gray-600" />;
    default: return <Bell className="w-4 h-4 text-gray-600" />;
  }
};

const Notifications = () => {
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [selected, setSelected] = useState<DbNotificationRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', typeFilter, priorityFilter],
    queryFn: () => fetchNotifications({ type: typeFilter, priority: priorityFilter }),
    staleTime: 10_000,
    enabled: !!user && !user.id.startsWith('demo-'), // only when authenticated via Supabase
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length;
  const actionRequiredCount = notifications.filter(n => n.action_required && !n.read).length;

  // Timestamp formatter with i18n
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return t('notificationsPage.time.justNow', 'Just now');
    if (diffHours < 24) return t('notificationsPage.time.hoursAgo', { count: diffHours, defaultValue: '{{count}}h ago' });
    if (diffHours < 48) return t('notificationsPage.time.yesterday', 'Yesterday');
    return date.toLocaleDateString();
  };

  // Realtime subscription to notification changes for current user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const handleMarkUnread = async (id: string) => {
    await markAsUnread(id);
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    if (selected?.id === id) setSelected(null);
    toast({
      title: t('notificationsPage.toasts.deletedTitle', 'Notification Deleted'),
      description: t('notificationsPage.toasts.deletedDesc', 'The notification has been removed.'),
    });
  };
  const handleMarkAllRead = async () => {
    // Batch update read state; RLS restricts to current user rows.
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast({
      title: t('notificationsPage.toasts.allMarkedTitle', 'All Marked Read'),
      description: t('notificationsPage.toasts.allMarkedDesc', 'All notifications were marked as read.'),
    });
  };

  const tType = (type: NotificationType) =>
    t(`notificationsPage.types.${type}`, { defaultValue: notificationPrettyType(type) });
  const tPriority = (p: NotificationPriority) =>
    t(`notificationsPage.priority.${p}`, { defaultValue: p });

  // Pagination calculations
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = notifications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, priorityFilter]);

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('notificationsPage.detail.title', 'Notification Details')}</h2>
            <p className="text-muted-foreground">{selected.title}</p>
          </div>
          <Button variant="outline" onClick={() => setSelected(null)} className="w-full sm:w-auto">
            {t('notificationsPage.detail.back', 'Back to Notifications')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {typeToIcon(selected.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl">{selected.title}</CardTitle>
                  <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${typeToBadge(selected.type)} text-xs`}>{tType(selected.type)}</Badge>
                      <Badge className={`${priorityToBadge(selected.priority)} text-xs`}>{tPriority(selected.priority)}</Badge>
                    </div>
                    <span className="text-xs sm:text-sm">{formatTimestamp(selected.created_at)}</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:flex-shrink-0">
                {!selected.read ? (
                  <Button variant="outline" size="sm" onClick={() => handleMarkRead(selected.id)} className="text-xs sm:text-sm">
                    <Check className="w-4 h-4 mr-1" /> 
                    <span className="hidden sm:inline">{t('notificationsPage.buttons.markRead', 'Mark as read')}</span>
                    <span className="sm:hidden">Mark Read</span>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleMarkUnread(selected.id)} className="text-xs sm:text-sm">
                    <Mail className="w-4 h-4 mr-1" /> 
                    <span className="hidden sm:inline">{t('notificationsPage.buttons.markUnread', 'Mark as unread')}</span>
                    <span className="sm:hidden">Mark Unread</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDelete(selected.id)} className="text-xs sm:text-sm">
                  <Trash2 className="w-4 h-4 mr-1" /> 
                  <span className="hidden sm:inline">{t('notificationsPage.buttons.delete', 'Delete')}</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message + optional Disqualification Reasons list */}
            {selected.type === 'sample_disqualified' ? (
              (() => {
                const { base, reasons } = parseDisqualificationMessage(selected.message);
                return (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">{t('notificationsPage.detail.message', 'Message')}</h4>
                      <p className="text-muted-foreground">{base}</p>
                    </div>
                    {reasons.length > 0 && (
                      <div className="mt-2 border border-red-200 bg-red-50 rounded-md p-3">
                        <h5 className="text-xs sm:text-sm font-semibold text-red-800 mb-2">{t('notificationsPage.detail.disqualificationReasons', 'Disqualification Reasons:')}</h5>
                        <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                          {reasons.map((r, i) => (
                            <li key={i} className="relative pl-4">
                              <span className="absolute left-0">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div>
                <h4 className="font-medium mb-2">{t('notificationsPage.detail.message', 'Message')}</h4>
                <p className="text-muted-foreground">{selected.message}</p>
              </div>
            )}

            {selected.details && (
              <div>
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('notificationsPage.detail.details', 'Details')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">{selected.details}</p>
              </div>
            )}
            {selected.expires_at && (
              <div>
                <h4 className="font-medium mb-2 text-sm sm:text-base">{t('notificationsPage.detail.expires', 'Expires')}</h4>
                <p className="text-xs sm:text-sm text-red-600 font-medium">{new Date(selected.expires_at).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('notificationsPage.title', 'Notifications')}</h2>
          <p className="text-muted-foreground">{t('notificationsPage.description', 'Stay updated with contest and sample activity.')}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleMarkAllRead} className="w-full sm:w-auto">{t('notificationsPage.markAllRead', 'Mark all as read')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('notificationsPage.stats.unread', 'Unread')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('notificationsPage.stats.pending', 'Pending items')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('notificationsPage.stats.urgent', 'Urgent')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('notificationsPage.stats.highPriority', 'High priority')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{urgentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('notificationsPage.stats.actionRequired', 'Action Required')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('notificationsPage.stats.requiresAttention', 'Requires attention')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{actionRequiredCount}</div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('notificationsPage.filters.title', 'Filters')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('notificationsPage.filters.description', 'Type and priority')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="flex flex-col">
                <label className="text-xs sm:text-sm text-muted-foreground">{t('notificationsPage.filters.type', 'Type')}</label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t('notificationsPage.filters.all', 'All')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('notificationsPage.typeOptions.all', 'All')}</SelectItem>
                    <SelectItem value="user_registered">{t('notificationsPage.typeOptions.user_registered', 'User Registered')}</SelectItem>
                    <SelectItem value="sample_added">{t('notificationsPage.typeOptions.sample_added', 'Sample Added')}</SelectItem>
                    <SelectItem value="sample_received">{t('notificationsPage.typeOptions.sample_received', 'Sample Received')}</SelectItem>
                    <SelectItem value="sample_disqualified">{t('notificationsPage.typeOptions.sample_disqualified', 'Sample Disqualified')}</SelectItem>
                    <SelectItem value="sample_approved">{t('notificationsPage.typeOptions.sample_approved', 'Sample Approved')}</SelectItem>
                    <SelectItem value="sample_assigned_to_judge">{t('notificationsPage.typeOptions.sample_assigned_to_judge', 'Assigned To Judge')}</SelectItem>
                    <SelectItem value="judge_evaluated_sample">{t('notificationsPage.typeOptions.judge_evaluated_sample', 'Judge Evaluated')}</SelectItem>
                    <SelectItem value="evaluator_evaluated_sample">{t('notificationsPage.typeOptions.evaluator_evaluated_sample', 'Evaluator Evaluated')}</SelectItem>
                    <SelectItem value="contest_created">{t('notificationsPage.typeOptions.contest_created', 'Contest Created')}</SelectItem>
                    <SelectItem value="contest_completed">{t('notificationsPage.typeOptions.contest_completed', 'Contest Completed')}</SelectItem>
                    <SelectItem value="contest_final_stage">{t('notificationsPage.typeOptions.contest_final_stage', 'Final Stage')}</SelectItem>
                    <SelectItem value="final_ranking_top3">{t('notificationsPage.typeOptions.final_ranking_top3', 'Final Top 3')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs sm:text-sm text-muted-foreground">{t('notificationsPage.filters.priority', 'Priority')}</label>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t('notificationsPage.filters.all', 'All')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('notificationsPage.priorityOptions.all', 'All')}</SelectItem>
                    <SelectItem value="low">{t('notificationsPage.priorityOptions.low', 'Low')}</SelectItem>
                    <SelectItem value="medium">{t('notificationsPage.priorityOptions.medium', 'Medium')}</SelectItem>
                    <SelectItem value="high">{t('notificationsPage.priorityOptions.high', 'High')}</SelectItem>
                    <SelectItem value="urgent">{t('notificationsPage.priorityOptions.urgent', 'Urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('notificationsPage.inbox.title', 'Inbox')}</CardTitle>
          <CardDescription>{t('notificationsPage.inbox.description', 'Your notifications')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">{t('notificationsPage.inbox.loading', 'Loading...')}</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t('notificationsPage.inbox.empty', 'No notifications')}</div>
          ) : (
            <>
              <div className="divide-y">
                {paginatedNotifications.map((n) => (
                <div key={n.id} className="py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {typeToIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <span className="font-medium cursor-pointer hover:underline text-sm sm:text-base" onClick={() => { setSelected(n); handleMarkRead(n.id); }}>{n.title}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${typeToBadge(n.type)} text-xs`}>{tType(n.type)}</Badge>
                          <Badge className={`${priorityToBadge(n.priority)} text-xs`}>{tPriority(n.priority)}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTimestamp(n.created_at)}</span>
                        </div>
                      </div>
                      {n.type === 'sample_disqualified' ? (
                        (() => {
                          const { base, reasons } = parseDisqualificationMessage(n.message);
                          return (
                            <>
                              <p className="text-sm text-muted-foreground">{base}</p>
                              {reasons.length > 0 && (
                                <div className="mt-2 border border-red-200 bg-red-50 rounded-md p-2">
                                  <h6 className="text-xs font-semibold text-red-800 mb-1">{t('notificationsPage.detail.disqualificationReasons', 'Disqualification Reasons:')}</h6>
                                  <ul className="text-xs text-red-700 space-y-1">
                                    {reasons.map((r, i) => (
                                      <li key={i} className="relative pl-4">
                                        <span className="absolute left-0">•</span>
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                      )}
                      {n.details && <p className="text-xs text-muted-foreground mt-1">{n.details}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:flex-shrink-0">
                    {!n.read ? (
                      <Button variant="outline" size="sm" onClick={() => handleMarkRead(n.id)} className="text-xs sm:text-sm">
                        <Check className="w-4 h-4 mr-1" /> 
                        <span className="hidden sm:inline">{t('notificationsPage.buttons.markRead', 'Mark as read')}</span>
                        <span className="sm:hidden">Mark Read</span>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleMarkUnread(n.id)} className="text-xs sm:text-sm">
                        <Mail className="w-4 h-4 mr-1" /> 
                        <span className="hidden sm:inline">{t('notificationsPage.buttons.markUnread', 'Mark as unread')}</span>
                        <span className="sm:hidden">Mark Unread</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDelete(n.id)} className="text-xs sm:text-sm">
                      <Trash2 className="w-4 h-4 mr-1" /> 
                      <span className="hidden sm:inline">{t('notificationsPage.buttons.delete', 'Delete')}</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
              </div>

              {/* Pagination */}
              {!isLoading && notifications.length > 0 && totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, notifications.length)} of {notifications.length} notifications
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;