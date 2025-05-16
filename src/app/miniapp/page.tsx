'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import ProfileClient from '~/components/ProfileClient';
import { useSearchParams } from 'next/navigation';

export default function MiniAppPage() {
  const { isFrameReady, context, setFrameReady } = useMiniKit();
  const [username, setUsername] = useState<string>('nisargthakkar');
  const searchParams = useSearchParams();

  useEffect(() => {
    // This is a dedicated Mini App route, so we know we're in a Mini App context
    if (!isFrameReady) {
      // Hide the splash screen when the app is ready
      console.log('Mini App page loaded, hiding splash screen...');
      setFrameReady();
    }

    // Extract username from URL if present
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
    } else if (context?.user?.username) {
      // If no username in URL but we have user context from Farcaster
      setUsername(context.user.username);
    }
  }, [isFrameReady, setFrameReady, context, searchParams]);

  // In Mini App mode, render just the profile without website chrome
  return <ProfileClient username={username} />;
} 