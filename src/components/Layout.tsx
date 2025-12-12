import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Globe, User, LogOut, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Globe, label: 'Explore' },
    { path: '/home', icon: Home, label: 'Home', requiresAuth: true },
    { path: `/profile/${user?.id}`, icon: User, label: 'Profile', requiresAuth: true },
  ];

  return (
    <div className="min-h-screen gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full gradient-primary" />
            <span className="font-display text-xl font-bold text-gradient">Social Spark</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) return null;
              const isActive = location.pathname === item.path || 
                (item.path.includes('/profile/') && location.pathname.startsWith('/profile/') && item.path === `/profile/${user?.id}`);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/create">
                  <Button variant="default" size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Post</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) return null;
              const isActive = location.pathname === item.path ||
                (item.path.includes('/profile/') && location.pathname.startsWith('/profile/') && item.path === `/profile/${user?.id}`);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/create"
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-primary"
            >
              <PlusCircle className="h-5 w-5" />
              <span className="text-xs font-medium">Post</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
