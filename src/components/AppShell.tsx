import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCircle,
  BarChart3,
  Compass,
  Map,
  TrendingUp,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SkillPathLogo } from './Logo';

interface AppShellProps {
  title: string;
  breadcrumb?: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'My Profile', icon: UserCircle },
  { to: '/skills', label: 'Skill Analysis', icon: BarChart3 },
  { to: '/careers', label: 'Career Recommendations', icon: Compass },
  { to: '/roadmap', label: 'Learning Roadmap', icon: Map },
  { to: '/progress', label: 'Weekly Progress', icon: TrendingUp },
  { to: '/resources', label: 'Courses & Resources', icon: BookOpen },
  { to: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { to: '/mentor', label: 'AI Mentor', icon: MessageSquare },
  { to: '/agents', label: 'Agent Activity', icon: Bot },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ title, breadcrumb, primaryAction, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.fullName || 'S')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-[#E2EAE5] dark:border-slate-800">
      <div className="px-5 h-16 border-b border-[#E8EFEA] dark:border-slate-800 flex items-center justify-between">
        <NavLink to="/dashboard" className="focus:outline-none">
          <SkillPathLogo />
        </NavLink>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1" aria-label="Primary Sidebar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EAF5EE] text-[#15803D] font-semibold dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-[#F3F8F5] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-[#E8EFEA] dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#F4F8F5] dark:bg-slate-800/50 border border-[#E6EEE9] dark:border-slate-800">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-[#D4E2D8] dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.profile?.selectedCareer || user?.educationLevel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F5F2] dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:p-4">
      <div className="min-h-screen lg:min-h-[calc(100vh-2rem)] max-w-[1440px] mx-auto bg-[#FAFDFB]/95 dark:bg-slate-900/95 backdrop-blur-xl lg:rounded-[24px] border border-[#DCE6DF] dark:border-slate-800 shadow-[0_20px_50px_-24px_rgba(21,128,61,0.14)] flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[252px] shrink-0 sticky top-0 max-h-screen">
          {SidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-[260px] max-w-[85vw] h-full z-10">
              {SidebarContent}
            </div>
          </div>
        )}

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F7FAF8]/90 dark:bg-slate-950/60">
          <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-[#E5EDE8] dark:border-slate-800 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-[#EAF5EE] dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap">
                  SkillPath AI
                </span>
                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden="true">
                  /
                </span>
                {breadcrumb && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400 hidden md:inline whitespace-nowrap">
                      {breadcrumb}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 hidden md:inline" aria-hidden="true">
                      /
                    </span>
                  </>
                )}
                <h1 className="font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#F3F8F5] dark:hover:bg-slate-700 transition-colors"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {primaryAction}
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
