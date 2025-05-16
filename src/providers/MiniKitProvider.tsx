'use client';
 
import { MiniKitProvider as OnchainMiniKitProvider } from '@coinbase/onchainkit/minikit';
import { ReactNode } from 'react';
import { base } from 'viem/chains';
 
export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainMiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: 'dark',
          theme: 'base',
          name: 'Klyro Profile',
          logo: 'https://miniapp.klyro.dev/logo.png',
        },
      }}
    >
      {children}
    </OnchainMiniKitProvider>
  );
}