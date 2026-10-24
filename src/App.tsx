import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { useCommunityData } from '@/lib/useCommunityData';
import AuthScreen from '@/components/AuthScreen';
import AdminOnboarding from '@/components/AdminOnboarding';
import Onboarding from '@/components/Onboarding';
import PendingApproval from '@/components/PendingApproval';
import Layout, { type PageKey } from '@/components/Layout';
import HomePage from '@/components/HomePage';
import DiscoverPage from '@/components/DiscoverPage';
import OffersPage from '@/components/OffersPage';
import NeedsPage from '@/components/NeedsPage';
import MatchesPage from '@/components/MatchesPage';
import AgentLogPage from '@/components/AgentLogPage';
import CommunitySettingsPage from '@/components/CommunitySettingsPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('home');
  const data = useCommunityData();

  useEffect(() => {
    if (profile?.onboarding_complete) {
      setPage('home');
    }
  }, [profile?.onboarding_complete]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border-2 border-t-text-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (profile?.membership_status === 'pending') {
    return <PendingApproval />;
  }

  if (profile?.role === 'admin' && !profile.community_id) {
    return <AdminOnboarding />;
  }

  if (profile && !profile.onboarding_complete) {
    return <Onboarding />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage} data={data}>
      {page === 'home' && <HomePage data={data} onNavigate={setPage} />}
      {page === 'discover' && <DiscoverPage data={data} />}
      {page === 'offers' && <OffersPage data={data} />}
      {page === 'needs' && <NeedsPage data={data} />}
      {page === 'matches' && <MatchesPage data={data} />}
      {page === 'activity' && <AgentLogPage data={data} />}
      {page === 'community' && profile?.role === 'admin' && <CommunitySettingsPage data={data} />}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
