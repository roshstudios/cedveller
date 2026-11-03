import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Shell, btn } from '@/components/shell';
import { ErrorCard, SkeletonBlock } from '@/components/shell';
import { useListMySchedules } from '@workspace/api-client-react';
import { errMsg } from '@/lib/schedule';
import Today from '@/pages/today';
import Program from '@/pages/program';
import Upload from '@/pages/upload';
import Friends from '@/pages/friends';
import Share from '@/pages/share';
import Settings from '@/pages/settings';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 15000, refetchInterval: 60000 } } });

function Missing() {
  return (
    <div className="mt-16 text-center">
      <div className="font-display font-extrabold text-7xl tnum">404</div>
      <p className="text-muted-foreground mt-2">Bu səhifə mövcud deyil.</p>
      <Link href="/" className={`${btn.ink} mt-6`}>Bu günə qayıt</Link>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const mine = useListMySchedules();
  const publicShare = location.startsWith('/paylas/');
  const firstVisit = !publicShare && mine.isSuccess && mine.data.length === 0;
  if (!publicShare && mine.isPending) return <Shell showNavigation={false}><SkeletonBlock className="mt-8 h-72" /></Shell>;
  if (!publicShare && mine.error) return <Shell showNavigation={false}><ErrorCard message={errMsg(mine.error)} onRetry={() => mine.refetch()} /></Shell>;
  return (
    <Shell showNavigation={!firstVisit}>
      <RoutedErrorBoundary>
        {firstVisit ? <Upload onboarding /> :
        <Switch>
          <Route path="/" component={Today} />
          <Route path="/program" component={Program} />
          <Route path="/yukle"><Upload /></Route>
          <Route path="/arkadaslar" component={Friends} />
          <Route path="/paylas/:id" component={Share} />
          <Route path="/ayarlar" component={Settings} />
          <Route component={Missing} />
        </Switch>
        }
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
