import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { somniaTestnet } from './web3Config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Initialize Data Streams SDK
let dataStreamsSDK: SDK | null = null;
let publicClientInstance: ReturnType<typeof createPublicClient> | null = null;
const sdkCapabilities = {
  hasWalletClient: false,
};

export const getDataStreamsCapabilities = () => sdkCapabilities;

export const initializeDataStreams = async (walletClient?: any) => {
  try {
    if (!publicClientInstance) {
      console.log('🔄 Initializing Somnia Data Streams SDK...');

      const rpcUrl = somniaTestnet.rpcUrls.default.http[0];
      if (!rpcUrl) {
        throw new Error('Somnia RPC URL not configured in web3Config.ts');
      }

      console.log('🔧 Using RPC endpoint:', rpcUrl);

      publicClientInstance = createPublicClient({
        chain: somniaTestnet,
        transport: http(rpcUrl),
      });

      console.log('✅ Public client created for chain:', somniaTestnet.name);
    }

    // Create wallet client for writing (if wallet is connected)
    // Wallet client is OPTIONAL - only needed for emitting events
    let walletClientInstance;
    if (walletClient) {
      console.log('✅ Using provided wallet client from wagmi');
      walletClientInstance = walletClient;
    } else if (typeof window !== 'undefined' && window.ethereum) {
      console.log('📝 Creating wallet client from window.ethereum');
      try {
        walletClientInstance = createWalletClient({
          chain: somniaTestnet,
          transport: custom(window.ethereum),
        });
        console.log('✅ Created wallet client from window.ethereum');
      } catch (err) {
        console.warn('⚠️ Failed to create wallet client:', err);
      }
    }

    const needsWalletUpgrade = !!walletClientInstance && !sdkCapabilities.hasWalletClient;

    // Return existing SDK if already initialized and no wallet upgrade required
    if (dataStreamsSDK && !needsWalletUpgrade) {
      console.log('✅ Data Streams SDK already initialized, reusing existing instance');
      return dataStreamsSDK;
    }

    if (walletClientInstance) {
      sdkCapabilities.hasWalletClient = true;
    } else if (!dataStreamsSDK) {
      sdkCapabilities.hasWalletClient = false;
    }

    if (dataStreamsSDK && walletClientInstance && needsWalletUpgrade) {
      console.log('♻️ Rebuilding Data Streams SDK with wallet support');
    } else if (dataStreamsSDK) {
      return dataStreamsSDK;
    }

    // Initialize SDK with official pattern from Somnia docs
    const sdkConfig: any = {
      public: publicClientInstance,
      ...(walletClientInstance && { wallet: walletClientInstance }),
    };

    console.log('🔧 Creating SDK instance...');
    console.log('SDK Config:', {
      hasPublicClient: !!sdkConfig.public,
      hasWalletClient: !!sdkConfig.wallet,
      mode: sdkConfig.wallet ? 'read-write' : 'read-only',
    });

    dataStreamsSDK = new SDK(sdkConfig);

    console.log('✅ Somnia Data Streams SDK initialized successfully');
    console.log('SDK streams available:', !!dataStreamsSDK.streams);

    return dataStreamsSDK;
  } catch (error) {
    console.error('❌ Failed to initialize Data Streams SDK:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const getDataStreamsSDK = (): SDK | null => {
  return dataStreamsSDK;
};

export const getDataStreamsPublicClient = () => publicClientInstance;

// Data Streams configuration
export const DATA_STREAMS_CONFIG = {
  // Schema IDs will be computed and stored here after creation
  schemaIds: {
    raceStart: null as string | null,
    raceProgress: null as string | null,
    raceFinish: null as string | null,
    leaderboardUpdate: null as string | null,
    tournamentUpdate: null as string | null,
  },

  // Stream IDs for different data types
  streamIds: {
    globalRaces: 'somnia-racing-global',
    leaderboard: 'somnia-racing-leaderboard',
    tournaments: 'somnia-racing-tournaments',
  },
};
