import { Redirect } from 'expo-router';

import { useApp } from '@/context/AppContext';

export default function Index() {
  const { isAuthenticated, onboarded } = useApp();
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
