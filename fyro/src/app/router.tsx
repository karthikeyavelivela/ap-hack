import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router-dom';
import { NotFound, ServerError } from '@/routes/ErrorPages';
import PublicLayout from '@/layouts/PublicLayout';
import AppLayout from '@/layouts/AppLayout';

const L = {
  Landing: lazy(() => import('@/features/marketing/Landing')),
  HowItWorks: lazy(() => import('@/features/marketing/HowItWorks')),
  PublicLayer: lazy(() => import('@/features/marketing/PublicLayerPage')),
  Features: lazy(() => import('@/features/marketing/Features')),
  Regions: lazy(() => import('@/features/marketing/RegionsPage')),
  Pricing: lazy(() => import('@/features/marketing/Pricing')),
  About: lazy(() => import('@/features/marketing/About')),
  Contact: lazy(() => import('@/features/marketing/Contact')),
  Docs: lazy(() => import('@/features/marketing/Docs')),
  Legal: lazy(() => import('@/features/marketing/Legal')),
  Login: lazy(() => import('@/features/auth/Login')),
  Signup: lazy(() => import('@/features/auth/AuthPages').then((m) => ({ default: m.Signup }))),
  Forgot: lazy(() => import('@/features/auth/AuthPages').then((m) => ({ default: m.Forgot }))),
  Reset: lazy(() => import('@/features/auth/AuthPages').then((m) => ({ default: m.Reset }))),
  Otp: lazy(() => import('@/features/auth/AuthPages').then((m) => ({ default: m.VerifyOtp }))),
  Dashboard: lazy(() => import('@/features/dashboard/Dashboard')),
  Inbox: lazy(() => import('@/features/inbox/Inbox')),
  Incidents: lazy(() => import('@/features/incidents/IncidentsPage')),
  IncidentDetail: lazy(() => import('@/features/incidents/IncidentDetail')),
  Emerging: lazy(() => import('@/features/emerging/EmergingPage')),
  Briefs: lazy(() => import('@/features/briefs/BriefsPage')),
  BriefView: lazy(() => import('@/features/briefs/BriefView')),
  Routing: lazy(() => import('@/features/routing/RoutingPage')),
  Stores: lazy(() => import('@/features/stores/StoresPage')),
  StoreProfile: lazy(() => import('@/features/stores/StoreProfile')),
  Map: lazy(() => import('@/features/map/MapPage')),
  Layers: lazy(() => import('@/features/layers/LayersOverview')),
  Layer: lazy(() => import('@/features/layers/LayerPage')),
  Evaluation: lazy(() => import('@/features/evaluation/EvaluationPage')),
  Explorer: lazy(() => import('@/features/explorer/ExplorerPage')),
  Taxonomy: lazy(() => import('@/features/admin/TaxonomyPage')),
  Policy: lazy(() => import('@/features/admin/PolicyPage')),
  Users: lazy(() => import('@/features/admin/UsersPage')),
  Notifications: lazy(() => import('@/features/account/NotificationsPage')),
  Settings: lazy(() => import('@/features/account/SettingsPage')),
  Help: lazy(() => import('@/features/account/HelpPage')),
  Tara: lazy(() => import('@/features/tara/TaraPage')),
};

function Root() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <ServerError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <L.Landing /> },
          { path: '/how-it-works', element: <L.HowItWorks /> },
          { path: '/layers/:id', element: <L.PublicLayer /> },
          { path: '/features', element: <L.Features /> },
          { path: '/regions', element: <L.Regions /> },
          { path: '/pricing', element: <L.Pricing /> },
          { path: '/about', element: <L.About /> },
          { path: '/contact', element: <L.Contact /> },
          { path: '/docs', element: <L.Docs /> },
          { path: '/privacy', element: <L.Legal kind="privacy" /> },
          { path: '/terms', element: <L.Legal kind="terms" /> },
        ],
      },
      { path: '/login', element: <L.Login /> },
      { path: '/signup', element: <L.Signup /> },
      { path: '/forgot-password', element: <L.Forgot /> },
      { path: '/reset-password', element: <L.Reset /> },
      { path: '/verify-otp', element: <L.Otp /> },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <L.Dashboard /> },
          { path: 'inbox', element: <L.Inbox /> },
          { path: 'incidents', element: <L.Incidents /> },
          { path: 'incidents/:id', element: <L.IncidentDetail /> },
          { path: 'emerging', element: <L.Emerging /> },
          { path: 'briefs', element: <L.Briefs /> },
          { path: 'briefs/:region/:week', element: <L.BriefView /> },
          { path: 'routing', element: <L.Routing /> },
          { path: 'stores', element: <L.Stores /> },
          { path: 'stores/:id', element: <L.StoreProfile /> },
          { path: 'map', element: <L.Map /> },
          { path: 'layers', element: <L.Layers /> },
          { path: 'layers/:id', element: <L.Layer /> },
          { path: 'evaluation', element: <L.Evaluation /> },
          { path: 'explorer', element: <L.Explorer /> },
          { path: 'taxonomy', element: <L.Taxonomy /> },
          { path: 'policy', element: <L.Policy /> },
          { path: 'users', element: <L.Users /> },
          { path: 'notifications', element: <L.Notifications /> },
          { path: 'settings', element: <L.Settings /> },
          { path: 'help', element: <L.Help /> },
          { path: 'tara', element: <L.Tara /> },
          { path: '*', element: <NotFound inApp /> },
        ],
      },
      { path: '/500', element: <ServerError /> },
      { path: '/app/home', element: <Navigate to="/app" replace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
], { future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true } as never });
