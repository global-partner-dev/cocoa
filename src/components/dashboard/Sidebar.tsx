import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  UserCheck, 
  ClipboardList, 
  Bell, 
  Upload, 
  BarChart, 
  LogOut,
  Award,
  Microscope,
  UserPlus,
  Eye,
  LayoutDashboard,
  User as UserIcon
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isCollapsed: boolean;
}

const getRoleMenuItems = (t: any): Record<UserRole, Array<{ icon: React.ComponentType<{ className?: string }>; label: string; path: string }>> => ({
  admin: [
    { icon: LayoutDashboard, label: t('dashboard.sidebar.menuItems.dashboard'), path: "/dashboard" },
    { icon: Users, label: t('dashboard.sidebar.menuItems.userManagement'), path: "/dashboard/users" },
    { icon: Calendar, label: t('dashboard.sidebar.menuItems.contestManagement'), path: "/dashboard/contests" },
    { icon: FileText, label: t('dashboard.sidebar.menuItems.sampleManagement'), path: "/dashboard/samples" },
    { icon: BarChart, label: t('dashboard.sidebar.menuItems.initialResults'), path: "/dashboard/results" },
    { icon: Award, label: t('dashboard.sidebar.menuItems.finalResults'), path: "/dashboard/final-results" },
    { icon: DollarSign, label: t('dashboard.sidebar.menuItems.financeManagement'), path: "/dashboard/finance" },
    { icon: Bell, label: t('dashboard.sidebar.menuItems.notifications'), path: "/dashboard/notifications" },
    { icon: UserIcon, label: t('dashboard.sidebar.menuItems.myProfile'), path: "/dashboard/profile" },
  ],
  director: [
    { icon: LayoutDashboard, label: t('dashboard.sidebar.menuItems.dashboard'), path: "/dashboard" },
    { icon: FileText, label: t('dashboard.sidebar.menuItems.sampleManagement'), path: "/dashboard/samples" },
    { icon: Microscope, label: t('dashboard.sidebar.menuItems.physicalEvaluation'), path: "/dashboard/physical-evaluation" },
    { icon: UserPlus, label: t('dashboard.sidebar.menuItems.judgeAssignment'), path: "/dashboard/sample-assignment" },
    { icon: Eye, label: t('dashboard.sidebar.menuItems.evaluationSupervision'), path: "/dashboard/evaluation-supervision" },
    { icon: BarChart, label: t('dashboard.sidebar.menuItems.initialResults'), path: "/dashboard/results" },
    { icon: Award, label: t('dashboard.sidebar.menuItems.finalResults'), path: "/dashboard/final-results" },
    { icon: Bell, label: t('dashboard.sidebar.menuItems.notifications'), path: "/dashboard/notifications" },
    { icon: UserIcon, label: t('dashboard.sidebar.menuItems.myProfile'), path: "/dashboard/profile" },
  ],
  judge: [
    { icon: LayoutDashboard, label: t('dashboard.sidebar.menuItems.dashboard'), path: "/dashboard" },
    { icon: BarChart, label: t('dashboard.sidebar.menuItems.initialResults'), path: "/dashboard/results" },
    { icon: Award, label: t('dashboard.sidebar.menuItems.finalResults'), path: "/dashboard/final-results" },
    { icon: Bell, label: t('dashboard.sidebar.menuItems.notifications'), path: "/dashboard/notifications" },
    { icon: UserIcon, label: t('dashboard.sidebar.menuItems.myProfile'), path: "/dashboard/profile" },
  ],
  participant: [
    { icon: LayoutDashboard, label: t('dashboard.sidebar.menuItems.dashboard'), path: "/dashboard" },
    { icon: Upload, label: t('dashboard.sidebar.menuItems.sampleSubmission'), path: "/dashboard/submission" },
    { icon: BarChart, label: t('dashboard.sidebar.menuItems.initialResults'), path: "/dashboard/results" },
    { icon: Award, label: t('dashboard.sidebar.menuItems.finalResults'), path: "/dashboard/final-results" },
    { icon: Bell, label: t('dashboard.sidebar.menuItems.notifications'), path: "/dashboard/notifications" },
    { icon: UserIcon, label: t('dashboard.sidebar.menuItems.myProfile'), path: "/dashboard/profile" },
  ],
  evaluator: [
    { icon: LayoutDashboard, label: t('dashboard.sidebar.menuItems.dashboard'), path: "/dashboard" },
    { icon: BarChart, label: t('dashboard.sidebar.menuItems.initialResults'), path: "/dashboard/results" },
    { icon: Award, label: t('dashboard.sidebar.menuItems.finalResults'), path: "/dashboard/final-results" },
    { icon: Bell, label: t('dashboard.sidebar.menuItems.notifications'), path: "/dashboard/notifications" },
    { icon: UserIcon, label: t('dashboard.sidebar.menuItems.myProfile'), path: "/dashboard/profile" },
  ],
});

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const menuItems = getRoleMenuItems(t)[user.role] || [];

  return (
    <div
      className={cn(
        "h-screen bg-gradient-to-b from-[hsl(var(--chocolate-dark))] to-[hsl(var(--chocolate-medium))] text-[hsl(var(--chocolate-cream))] transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--chocolate-cream)_/_0.2)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[hsl(var(--golden-accent))] to-[hsl(var(--golden-light))] rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-[hsl(var(--chocolate-dark))]" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-sm">{t('dashboard.sidebar.title')}</h2>
              <p className="text-xs text-[hsl(var(--chocolate-cream)_/_0.7)] capitalize">
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={index} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-[hsl(var(--chocolate-cream))] hover:bg-[hsl(var(--chocolate-cream)_/_0.1)] hover:text-[hsl(var(--golden-accent))]",
                    isActive && "bg-[hsl(var(--golden-accent)_/_0.2)] text-[hsl(var(--golden-accent))]",
                    isCollapsed ? "px-2" : "px-3"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-[hsl(var(--chocolate-cream)_/_0.2)]">
        {!isCollapsed && (
          <div className="mb-3 px-2">
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-[hsl(var(--chocolate-cream)_/_0.7)]">{user.email}</p>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full justify-start text-[hsl(var(--chocolate-cream))] hover:bg-red-500/20 hover:text-red-300",
            isCollapsed ? "px-2" : "px-3"
          )}
        >
          <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && t('dashboard.sidebar.userInfo.signOut')}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;