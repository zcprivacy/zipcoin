import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { fallback, http } from 'viem';
import { WagmiProvider, createConfig, unstable_connector } from 'wagmi';
import { injected } from 'wagmi/connectors';

import App from './App';
import { RPC_URL, anvil, chains } from './lib/config';
import './styles/site.css';
import './styles/app.css';

/**
 * Reads go through the connected wallet's own RPC first, so the app depends on no third-party
 * endpoint and reveals nothing the wallet does not already see. Public nodes that allow browser
 * origins are the fallback; viem's default (eth.merkle.io) rejects cross-origin requests.
 */
const mainnetTransport = fallback(
  [
    ...(RPC_URL ? [http(RPC_URL)] : []),
    unstable_connector(injected),
    http('https://ethereum-rpc.publicnode.com'),
    http('https://cloudflare-eth.com'),
  ],
  { rank: false },
);

const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [chains[0].id]: mainnetTransport,
    [anvil.id]: http('http://127.0.0.1:8546'),
  },
});

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
