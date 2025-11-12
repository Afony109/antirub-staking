// Configuration file for ANTI RUB Platform Statistics

const CONFIG = {
    // Contract Addresses - Sepolia Testnet
    contracts: {
        ARUB: '0xe4A39E3D2C64C2D3a1d9c7C6B9eB63db55277b71',
        USDT: '0x4e6175f449b04e20437b2A2AD8221884Bda38f39',
        STAKING: '0x47B302F223ae94e9efcABc27DE19C0a2eC268Df3'
    },
    
    // Network Configuration
    network: {
        chainId: '0xaa36a7', // Sepolia
        chainName: 'Sepolia Testnet',
        rpcUrls: [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            'https://rpc.sepolia.org'
        ],
        blockExplorerUrl: 'https://sepolia.etherscan.io/'
    },
    
    // Statistics Update Settings
    statistics: {
        updateInterval: 30000, // 30 seconds in milliseconds
        showDemoData: true, // Show demo data when blockchain is not available
        animateValues: true, // Enable value change animations
        
        // Demo values (used when blockchain is not available)
        demoValues: {
            usdtRubRate: 100.50,
            rateChange: 2.34,
            arubPrice: 99.50,
            totalBought: 125430,
            totalStakedUsdt: 50000,
            totalStakedArub: 75200,
            totalTvl: 125200,
            totalSupply: 1000000,
            stakersCount: 342,
            currentApy: 16,
            marketCap: 99500000,
            volume24h: 125430,
            transactions24h: 1247,
            uniqueWallets: 3421
        }
    },
    
    // Price Calculation
    pricing: {
        basePrice: 10000, // Base price for ARUB calculation
        // ARUB Price = basePrice / USDT_RUB_Rate
        // Example: 10000 / 100 = $100 per ARUB
    },
    
    // Staking Tiers Configuration
    stakingTiers: [
        {
            name: 'Bronze',
            icon: '🥉',
            apy: 8,
            minUSD: 0,
            maxUSD: 1000
        },
        {
            name: 'Silver', 
            icon: '🥈',
            apy: 12,
            minUSD: 1000,
            maxUSD: 10000
        },
        {
            name: 'Gold',
            icon: '🥇', 
            apy: 16,
            minUSD: 10000,
            maxUSD: 50000
        },
        {
            name: 'Diamond',
            icon: '💎',
            apy: 24,
            minUSD: 50000,
            maxUSD: null // No upper limit
        }
    ],
    
    // Exchange Rate API
    exchangeRateAPI: {
        enabled: true,
        endpoint: 'https://api.exchangerate-api.com/v4/latest/USD',
        fallbackRate: 100, // Default rate if API fails
        updateInterval: 60000 // Update every minute
    },
    
    // UI Configuration
    ui: {
        theme: 'ukrainian', // 'ukrainian', 'dark', 'light'
        colors: {
            primary: '#0057B7', // Ukraine blue
            secondary: '#FFD700', // Ukraine yellow
            background: '#0a0e1a',
            cardBg: '#1a1f2e',
            success: '#4CAF50',
            danger: '#f44336'
        },
        animations: {
            cardHover: true,
            valueChanges: true,
            fadeIn: true
        },
        language: 'uk' // Ukrainian
    },
    
    // Features Toggle
    features: {
        publicStatistics: true, // Show statistics without wallet connection
        trading: true, // Enable token trading
        staking: true, // Enable staking functionality
        faucet: true, // Enable USDT faucet for testing
        aiChat: false, // AI support chat widget
        notifications: true, // Show transaction notifications
    },
    
    // Error Handling
    errorHandling: {
        showErrors: true, // Show error messages to users
        logToConsole: true, // Log errors to console
        fallbackToDemo: true, // Use demo data on errors
        retryAttempts: 3, // Number of retry attempts for failed requests
        retryDelay: 1000 // Delay between retries in milliseconds
    },
    
    // Caching
    cache: {
        enabled: true,
        duration: 5000, // Cache duration in milliseconds
        keys: [
            'totalSupply',
            'totalBought',
            'totalStaked',
            'stakersCount'
        ]
    },
    
    // Social Links
    social: {
        telegram: 'https://t.me/antirub',
        twitter: 'https://twitter.com/antirub',
        discord: 'https://discord.gg/antirub',
        github: 'https://github.com/antirub'
    },
    
    // API Endpoints (for future backend integration)
    api: {
        baseUrl: 'https://api.antirub.com',
        endpoints: {
            statistics: '/api/v1/statistics',
            history: '/api/v1/history',
            transactions: '/api/v1/transactions',
            users: '/api/v1/users'
        }
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.ANTIRUB_CONFIG = CONFIG;
}
