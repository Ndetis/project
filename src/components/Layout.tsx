import { type ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCommunityData } from '@/lib/useCommunityData';
import { Home, Compass, Gift, HandHelping, Sparkles, LogOut, Bell, Activity } from 'lucide-react';

export type PageKey = 'home' | 'discover' | 'offers' | 'needs' | 'matches' | 'activity';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'discover', label: 'Discover', icon: Compass },
  { key: 'offers', label: 'My Offers', icon: Gift },
  { key: 'needs', label: 'My Needs', icon: HandHelping },
  { key: 'matches', label: 'Matches', icon: Sparkles },
  { key: 'activity', label: 'Agent Log', icon: Activity },
];

interface LayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  data: ReturnType<typeof useCommunityData>;
}

export default function Layout({ children, currentPage, onNavigate, data }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const unreadCount = data.notifications.filter((n) => !n.is_read).length;

  const handleNav = (page: PageKey) => {
    onNavigate(page);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-neutral-800 bg-neutral-900/50 fixed h-screen">
        <div className="p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-neutral-950 tracking-tighter">B</span>
            </div>
            <div>
              <p className="font-black tracking-tight text-neutral-50">BARTER</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Time · Talent · Treasure</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-neutral-100 text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
                {item.key === 'matches' && data.matches.filter((m) => m.status === 'pending').length > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-neutral-300 text-neutral-900' : 'bg-neutral-700 text-neutral-300'
                  }`}>
                    {data.matches.filter((m) => m.status === 'pending').length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-neutral-200 truncate">{profile?.full_name}</p>
            <p className="text-xs text-neutral-500">{data.community?.name}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
              <span className="text-sm font-black text-neutral-950 tracking-tighter">B</span>
            </div>
            <span className="font-black tracking-tight">BARTER</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100"
          >
            <div className="w-5 h-5 flex flex-col justify-center gap-1">
              <div className={`h-0.5 w-full bg-current transition-all ${mobileNavOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`h-0.5 w-full bg-current transition-all ${mobileNavOpen ? 'opacity-0' : ''}`} />
              <div className={`h-0.5 w-full bg-current transition-all ${mobileNavOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-neutral-950/80 pt-16" onClick={() => setMobileNavOpen(false)}>
          <nav className="p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-60 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-neutral-800/50">
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">{NAV_ITEMS.find((n) => n.key === currentPage)?.label}</h1>
            <p className="text-xs text-neutral-500">{data.community?.name} · {data.members.length} members</p>
          </div>
          <div className="relative">
            <button
              onClick={() => onNavigate('matches')}
              className="relative p-2.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-neutral-100 text-neutral-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
