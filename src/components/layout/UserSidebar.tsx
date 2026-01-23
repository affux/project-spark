import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { UserNotificationCenter } from '@/components/user/UserNotificationCenter';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Store,
  LogOut,
  ChevronRight,
  Wallet,
  Shield,
  MessageCircle,
  LifeBuoy,
  HelpCircle,
  Briefcase,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
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

const userNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Profile', href: '/dashboard/profile' },
  { icon: Store, label: 'My Storefront', href: '/dashboard/storefront' },
  { icon: Package, label: 'Browse Products', href: '/dashboard/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/dashboard/orders' },
  { icon: Wallet, label: 'Payments', href: '/dashboard/payments' },
  { icon: Briefcase, label: 'Workspace', href: '/dashboard/workspace' },
  { icon: Shield, label: 'KYC Verification', href: '/dashboard/kyc' },
  { icon: MessageCircle, label: 'Chat Support', href: '/dashboard/chat' },
  { icon: HelpCircle, label: 'FAQ & Help', href: '/dashboard/help' },
  { icon: LifeBuoy, label: 'Raise Ticket', href: '/dashboard/support' },
];

interface UserSidebarProps {
  user: {
    name?: string;
    email?: string;
  } | null;
  siteName: string;
  logoUrl?: string;
  userHubName?: string;
  defaultCurrency?: string;
  walletBalance?: number;
  balanceAnimating: boolean;
  userUnreadChatCount: number;
  onLogout: () => void;
  onCloseSidebar: () => void;
  onOpenPostpaidPanel: () => void;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
  user,
  siteName,
  logoUrl,
  userHubName,
  defaultCurrency,
  walletBalance,
  balanceAnimating,
  userUnreadChatCount,
  onLogout,
  onCloseSidebar,
  onOpenPostpaidPanel,
}) => {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('user-sidebar-view') as 'list' | 'grid') || 'list';
  });

  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(newMode);
    localStorage.setItem('user-sidebar-view', newMode);
  };

  const getBadgeCount = (href: string) => {
    if (href === '/dashboard/chat') return userUnreadChatCount;
    return 0;
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
              {userHubName || 'Dropshipper Hub'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserNotificationCenter />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {/* Wallet Balance Card */}
        {walletBalance !== undefined && (
          <div className="mb-4 mx-1 p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 mb-1 text-center">Wallet Balance</p>
            <p className={cn(
              "text-2xl font-bold text-sidebar-foreground transition-all duration-300 text-center",
              balanceAnimating && "animate-bounce text-primary scale-110"
            )}>
              {CURRENCY_SYMBOLS[defaultCurrency || 'USD'] || '$'}{walletBalance.toFixed(2)}
            </p>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleViewMode}
            className="h-8 w-8 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </Button>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-1">
            {userNavItems.map((item) => {
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
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 h-5 animate-pulse">
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
            {userNavItems.map((item) => {
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
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1 py-0 h-4 min-w-4 animate-pulse">
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
