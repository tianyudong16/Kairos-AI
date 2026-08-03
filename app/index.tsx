import { Redirect } from 'expo-router';

import { useApp } from '@/context/AppContext';

export default function Index() {
  const { onboarded } = useApp();
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
