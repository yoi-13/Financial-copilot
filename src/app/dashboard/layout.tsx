'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, Receipt, FileText, ClipboardCheck, LogOut, Menu, X, ChevronLeft, Settings } from 'lucide-react';
import { ToastProvider } from '@/components/toast-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeProvider } from '@/components/theme-provider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/closing', label: 'Close Day', icon: ClipboardCheck },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      <div className={`${collapsed ? 'px-0 py-4 text-center' : 'px-5 pt-5 pb-4'} border-b`}>
        {collapsed ? (
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-primary">FC</div>
        ) : (
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Financial Copilot</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">SME F&B</div>
          </div>
        )}
      </div>
      <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-[6px] text-sm transition-colors no-underline ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>
      <div className={`p-2 ${collapsed ? 'px-1' : ''}`}>
        <Button
          variant="outline"
          size="sm"
          className={`${collapsed ? 'w-full justify-center px-0' : 'w-full'} text-muted-foreground`}
          onClick={handleSignOut}
          disabled={signingOut}
          title="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span className="ml-2">{signingOut ? 'Signing out...' : 'Logout'}</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={closeMobile} />
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <div
          className={`fixed top-0 left-0 z-50 h-full bg-card border-r transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } w-[220px] flex flex-col`}
        >
          <div className="flex justify-end p-2">
            <button onClick={closeMobile} className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent border-none cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          {sidebarContent}
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <nav
          className={`relative border-r bg-card flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-200 ${
            collapsed ? 'w-[60px]' : 'w-[220px]'
          }`}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-8 z-10 w-6 h-6 rounded-full border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer shadow-sm"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`h-3 w-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          {sidebarContent}
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[960px]">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent border-none cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Financial Copilot</div>
          </div>
        )}
        <ErrorBoundary>
          <ToastProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </main>
    </div>
  );
}
