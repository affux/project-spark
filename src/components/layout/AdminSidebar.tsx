import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  LogOut,
  CreditCard,
  ChevronRight,
  Wallet,
  FileText,
  Send,
  Shield,
  MessageCircle,
  Globe,
  Bitcoin,
  Briefcase,
  LayoutGrid,
  List,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
  { icon: Wallet, label: 'Wallet', href: '/admin/wallet' },
  { icon: CreditCard, label: 'Postpaid', href: '/admin/postpaid' },
  { icon: Bitcoin, label: 'Crypto Payments', href: '/admin/crypto-payments' },
  { icon: Send, label: 'Payouts', href: '/admin/payouts' },
  { icon: Shield, label: 'KYC', href: '/admin/kyc' },
  { icon: Globe, label: 'IP Logs', href: '/admin/ip-logs' },
  { icon: MessageCircle, label: 'Chat', href: '/admin/chat' },
  { icon: Briefcase, label: 'Workspace', href: '/admin/workspace' },
  { icon: FileText, label: 'Reports', href: '/admin/reports' },
  { icon: Activity, label: 'Health Check', href: '/admin/health-check' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

interface AdminSidebarProps {
  user: {
    name?: string;
    email?: string;
  } | null;
  siteName: string;
  logoUrl?: string;
  adminPanelTitle?: string;
  pendingKYCCount: number;
  pendingChatCount: number;
  pendingCryptoCount: number;
  pendingProofsCount: number;
  onLogout: () => void;
  onCloseSidebar: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  user,
  siteName,
  logoUrl,
  adminPanelTitle,
  pendingKYCCount,
  pendingChatCount,
  pendingCryptoCount,
  pendingProofsCount,
  onLogout,
  onCloseSidebar,
}) => {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('admin-sidebar-view') as 'list' | 'grid') || 'list';
  });

  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(newMode);
    localStorage.setItem('admin-sidebar-view', newMode);
  };

  const getBadgeCount = (href: string) => {
    if (href === '/admin/kyc') return pendingKYCCount;
    if (href === '/admin/chat') return pendingChatCount;
    if (href === '/admin/crypto-payments') return pendingCryptoCount;
    if (href === '/admin/workspace') return pendingProofsCount;
    return 0;
  };

  const getBadgeColor = (href: string) => {
    if (href === '/admin/kyc') return 'bg-amber-500';
    if (href === '/admin/chat') return 'bg-red-500';
    if (href === '/admin/crypto-payments') return 'bg-orange-500';
    if (href === '/admin/workspace') return 'bg-purple-500';
    return 'bg-primary';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover shadow-lg" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg">
              <span className="text-accent-foreground font-bold text-lg">{siteName.charAt(0)}</span>
            </div>
          )}
          <div>
            <span className="font-bold text-lg text-sidebar-foreground">{siteName}</span>
            <p className="text-xs text-sidebar-foreground/60">
              {adminPanelTitle || 'Admin Panel'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-3 pt-4 pb-2 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleViewMode}
          className="h-8 w-8 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              const badgeCount = getBadgeCount(item.href);
              const hasBadge = badgeCount > 0;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onCloseSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {hasBadge && (
                    <Badge className={cn("ml-auto text-white text-xs px-1.5 py-0.5 h-5", getBadgeColor(item.href))}>
                      {badgeCount}
                    </Badge>
                  )}
                  {isActive && !hasBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              const badgeCount = getBadgeCount(item.href);
              const hasBadge = badgeCount > 0;
              
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      onClick={onCloseSidebar}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-medium transition-all duration-200 aspect-square",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="truncate w-full text-center text-[10px]">{item.label}</span>
                      {hasBadge && (
                        <Badge className={cn("absolute -top-1 -right-1 text-white text-[9px] px-1 py-0 h-4 min-w-4", getBadgeColor(item.href))}>
                          {badgeCount}
                        </Badge>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/50 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          <span>Sign out</span>
        </Button>
        <ThemeSelector className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-1" variant="ghost" showLabel />
      </div>
    </div>
  );
};
