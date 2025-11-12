// Contract Addresses
const CONTRACT_ADDRESSES = {
    ARUB: '0xe4A39E3D2C64C2D3a1d9c7C6B9eB63db55277b71',
    USDT: '0x4e6175f449b04e20437b2A2AD8221884Bda38f39',
    STAKING: '0x47B302F223ae94e9efcABc27DE19C0a2eC268Df3'
};

// CORRECT Contract ABIs - only methods that actually exist
const ARUB_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function currentPrice() view returns (uint256)",
    "function mint(uint256 usdtAmount) payable",
    "function burn(uint256 tokenAmount)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Mint(address indexed to, uint256 usdtAmount, uint256 tokenAmount)",
    "event Burn(address indexed from, uint256 tokenAmount, uint256 usdtAmount)"
];

const USDT_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function faucet()",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const STAKING_ABI = [
    "function totalStakedUSDT() view returns (uint256)",
    "function totalStakedARUB() view returns (uint256)",
    "function userStakes(address) view returns (uint256 usdtAmount, uint256 arubAmount, uint256 timestamp, uint256 lastClaimTime)",
    "function stake(address token, uint256 amount)",
    "function unstake(address token)",
    "function claimRewards()",
    "event Staked(address indexed user, address indexed token, uint256 amount)",
    "event Unstaked(address indexed user, address indexed token, uint256 amount)",
    "event RewardsClaimed(address indexed user, uint256 amount)"
];

// Global variables
let provider;
let signer;
let contracts = {};
let currentAccount = null;
let exchangeRate = 100; // Default USDT/RUB rate
let publicProvider; // Provider for public statistics (no wallet required)

// Statistics cache to avoid too many RPC calls
const statsCache = {
    data: {},
    timestamp: 0,
    ttl: 10000 // 10 seconds cache
};

// Initialize public provider for statistics
async function initializePublicProvider() {
    try {
        // Use public Sepolia RPC endpoint
        publicProvider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        
        // Initialize contracts with public provider
        contracts.publicARUB = new ethers.Contract(CONTRACT_ADDRESSES.ARUB, ARUB_ABI, publicProvider);
        contracts.publicUSDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, publicProvider);
        contracts.publicStaking = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, STAKING_ABI, publicProvider);
        
        console.log('✅ Public provider initialized successfully');
        
        // Test connection
        const network = await publicProvider.getNetwork();
        console.log('📡 Connected to network:', network.name, 'Chain ID:', network.chainId);
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing public provider:', error);
        // Fallback to another public RPC if the first one fails
        try {
            publicProvider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
            
            contracts.publicARUB = new ethers.Contract(CONTRACT_ADDRESSES.ARUB, ARUB_ABI, publicProvider);
            contracts.publicUSDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, publicProvider);
            contracts.publicStaking = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, STAKING_ABI, publicProvider);
            
            console.log('✅ Public provider initialized with fallback');
            return true;
        } catch (fallbackError) {
            console.error('❌ Fallback provider also failed:', fallbackError);
            return false;
        }
    }
}

// Fetch exchange rate
async function fetchExchangeRate() {
    try {
        // Try to fetch real exchange rate
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        exchangeRate = data.rates?.RUB || 100;
        console.log('💱 Exchange rate updated:', exchangeRate);
    } catch (error) {
        console.log('⚠️ Using default exchange rate:', exchangeRate);
    }
    
    // Update UI
    const rateElement = document.getElementById('usdtRubRate');
    if (rateElement) {
        rateElement.textContent = exchangeRate.toFixed(2);
        
        // Add change indicator (simulated for now)
        const changeElement = document.getElementById('rateChange');
        if (changeElement) {
            const change = (Math.random() - 0.5) * 5; // Random change for demo
            changeElement.textContent = `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%`;
            changeElement.className = change > 0 ? 'stat-change' : 'stat-change negative';
        }
    }
}

// Get actual blockchain data
async function getBlockchainData() {
    if (!contracts.publicARUB || !contracts.publicStaking) {
        console.log('⏳ Contracts not initialized yet');
        return null;
    }
    
    // Check cache
    const now = Date.now();
    if (statsCache.timestamp && (now - statsCache.timestamp) < statsCache.ttl) {
        console.log('📦 Using cached data');
        return statsCache.data;
    }
    
    const data = {};
    
    try {
        // Get ARUB total supply
        console.log('📊 Fetching ARUB total supply...');
        const totalSupply = await contracts.publicARUB.totalSupply();
        data.totalSupply = parseFloat(ethers.utils.formatUnits(totalSupply, 6));
        console.log('✅ Total Supply:', data.totalSupply);
    } catch (error) {
        console.error('❌ Error fetching total supply:', error.message);
        data.totalSupply = 0;
    }
    
    try {
        // Get current ARUB price
        console.log('📊 Fetching ARUB price...');
        const currentPrice = await contracts.publicARUB.currentPrice();
        data.currentPrice = parseFloat(ethers.utils.formatUnits(currentPrice, 6));
        console.log('✅ Current Price:', data.currentPrice);
    } catch (error) {
        console.error('❌ Error fetching current price:', error.message);
        // Calculate based on exchange rate
        data.currentPrice = 10000 / exchangeRate;
    }
    
    try {
        // Get staking data
        console.log('📊 Fetching staking data...');
        const stakedUSDT = await contracts.publicStaking.totalStakedUSDT();
        data.totalStakedUSDT = parseFloat(ethers.utils.formatUnits(stakedUSDT, 6));
        console.log('✅ Staked USDT:', data.totalStakedUSDT);
        
        const stakedARUB = await contracts.publicStaking.totalStakedARUB();
        data.totalStakedARUB = parseFloat(ethers.utils.formatUnits(stakedARUB, 6));
        console.log('✅ Staked ARUB:', data.totalStakedARUB);
    } catch (error) {
        console.error('❌ Error fetching staking data:', error.message);
        data.totalStakedUSDT = 0;
        data.totalStakedARUB = 0;
    }
    
    // Calculate derived values
    data.tvl = data.totalStakedUSDT + (data.totalStakedARUB * data.currentPrice);
    data.marketCap = data.totalSupply * data.currentPrice;
    
    // Calculate APY based on TVL
    if (data.tvl < 1000) data.currentApy = 8;
    else if (data.tvl < 10000) data.currentApy = 12;
    else if (data.tvl < 50000) data.currentApy = 16;
    else data.currentApy = 24;
    
    // For methods that don't exist in contracts, we'll calculate or estimate
    // Total bought = total supply (since all tokens are minted through buying)
    data.totalBought = data.totalSupply;
    
    // Estimate number of stakers by looking at past events (simplified for now)
    data.stakersCount = Math.floor(data.tvl / 365); // Rough estimate
    
    // Update cache
    statsCache.data = data;
    statsCache.timestamp = now;
    
    console.log('📊 Blockchain data collected:', data);
    return data;
}

// Update public statistics (works without wallet connection)
async function updatePublicStatistics() {
    console.log('🔄 Updating public statistics...');
    
    // Fetch exchange rate first
    await fetchExchangeRate();
    
    // Get blockchain data
    const blockchainData = await getBlockchainData();
    
    if (blockchainData && blockchainData.totalSupply > 0) {
        console.log('✅ Using REAL blockchain data from Sepolia');
        
        // Update UI with real data
        document.getElementById('arubPrice').textContent = `$${blockchainData.currentPrice.toFixed(2)}`;
        document.getElementById('totalBought').textContent = blockchainData.totalBought.toLocaleString();
        document.getElementById('totalStakedUsdt').textContent = blockchainData.totalStakedUSDT.toLocaleString();
        document.getElementById('totalStakedArub').textContent = blockchainData.totalStakedARUB.toLocaleString();
        document.getElementById('totalTvl').textContent = `$${blockchainData.tvl.toFixed(0).toLocaleString()}`;
        document.getElementById('totalSupply').textContent = blockchainData.totalSupply.toLocaleString();
        document.getElementById('stakersCount').textContent = blockchainData.stakersCount.toString();
        document.getElementById('currentApy').textContent = `${blockchainData.currentApy}%`;
        document.getElementById('marketCap').textContent = `$${blockchainData.marketCap.toFixed(0).toLocaleString()}`;
        
        // These are still estimates since we don't have real-time data
        document.getElementById('volume24h').textContent = `$${(blockchainData.tvl * 0.1).toFixed(0).toLocaleString()}`; // Estimate 10% of TVL
        document.getElementById('transactions24h').textContent = Math.floor(blockchainData.stakersCount * 3.6).toString(); // Estimate
        document.getElementById('uniqueWallets').textContent = blockchainData.stakersCount.toString();
        
        // Add indicator that this is real data
        console.log('🌐 REAL DATA from Sepolia blockchain displayed');
    } else {
        console.log('⚠️ Using DEMO data (blockchain not available or no data)');
        setDemoStatistics();
    }
    
    // Update timestamp
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// Set demo statistics (fallback when blockchain is not available)
function setDemoStatistics() {
    console.log('🎭 Setting DEMO statistics...');
    
    // Reasonable demo values
    document.getElementById('usdtRubRate').textContent = '100.50';
    document.getElementById('rateChange').textContent = '↑ 2.34%';
    document.getElementById('arubPrice').textContent = '$99.50';
    document.getElementById('totalBought').textContent = '1,000';
    document.getElementById('totalStakedUsdt').textContent = '500';
    document.getElementById('totalStakedArub').textContent = '750';
    document.getElementById('totalTvl').textContent = '$1,250';
    document.getElementById('totalSupply').textContent = '1,000';
    document.getElementById('stakersCount').textContent = '3';
    document.getElementById('currentApy').textContent = '8%';
    document.getElementById('marketCap').textContent = '$99,500';
    document.getElementById('volume24h').textContent = '$125';
    document.getElementById('transactions24h').textContent = '12';
    document.getElementById('uniqueWallets').textContent = '3';
    
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString() + ' (DEMO)';
}

// Initialize wallet connection
async function initializeWallet() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const modal = document.getElementById('walletModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    if (connectBtn) {
        connectBtn.onclick = () => {
            modal.style.display = 'block';
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
    // Wallet options
    const walletOptions = document.querySelectorAll('.wallet-option');
    walletOptions.forEach(option => {
        option.addEventListener('click', async (e) => {
            const walletType = e.currentTarget.dataset.wallet;
            await connectWallet(walletType);
            modal.style.display = 'none';
        });
    });
}

// Connect wallet function
async function connectWallet(walletType) {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install a Web3 wallet!');
            return;
        }
        
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        currentAccount = accounts[0];
        console.log('🔗 Wallet connected:', currentAccount);
        
        // Initialize provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Initialize contracts with signer
        contracts.ARUB = new ethers.Contract(CONTRACT_ADDRESSES.ARUB, ARUB_ABI, signer);
        contracts.USDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, signer);
        contracts.Staking = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, STAKING_ABI, signer);
        
        // Switch to Sepolia network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: {
                            name: 'Sepolia ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io/']
                    }]
                });
            }
        }
        
        // Update UI
        const connectBtn = document.getElementById('connectWalletBtn');
        connectBtn.innerHTML = `
            <span class="wallet-icon">✅</span>
            <span class="wallet-text">${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}</span>
        `;
        
        // Update user-specific data
        await updateUserData();
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

// Update user-specific data
async function updateUserData() {
    if (!currentAccount || !contracts.Staking) return;
    
    try {
        // Get user stakes
        const stakes = await contracts.Staking.userStakes(currentAccount);
        const usdtStaked = ethers.utils.formatUnits(stakes.usdtAmount, 6);
        const arubStaked = ethers.utils.formatUnits(stakes.arubAmount, 6);
        
        const userStakedElement = document.getElementById('userStaked');
        if (userStakedElement) {
            userStakedElement.textContent = 
                `${parseFloat(usdtStaked).toFixed(2)} USDT + ${parseFloat(arubStaked).toFixed(2)} ARUB`;
        }
        
        // Calculate rewards (simplified)
        const userRewardsElement = document.getElementById('userRewards');
        if (userRewardsElement) {
            const estimatedRewards = parseFloat(arubStaked) * 0.08; // 8% APY estimate
            userRewardsElement.textContent = `${estimatedRewards.toFixed(2)} ARUB`;
        }
        
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

// Calculate token amounts for trading
function calculateTokenAmounts() {
    // Buy calculation
    const buyInput = document.getElementById('buyAmount');
    const receiveDisplay = document.getElementById('receiveAmount');
    
    if (buyInput) {
        buyInput.addEventListener('input', () => {
            const usdtAmount = parseFloat(buyInput.value) || 0;
            const arubPrice = 10000 / exchangeRate;
            const arubAmount = usdtAmount / arubPrice;
            receiveDisplay.textContent = `${arubAmount.toFixed(2)} ARUB`;
        });
    }
    
    // Sell calculation
    const sellInput = document.getElementById('sellAmount');
    const returnDisplay = document.getElementById('returnAmount');
    
    if (sellInput) {
        sellInput.addEventListener('input', () => {
            const arubAmount = parseFloat(sellInput.value) || 0;
            const arubPrice = 10000 / exchangeRate;
            const usdtAmount = arubAmount * arubPrice;
            returnDisplay.textContent = `${usdtAmount.toFixed(2)} USDT`;
        });
    }
}

// Token selection for staking
function initializeTokenSelection() {
    const tokenBtns = document.querySelectorAll('.token-btn');
    const stakingSuffix = document.getElementById('stakingSuffix');
    
    tokenBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tokenBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (stakingSuffix) {
                stakingSuffix.textContent = btn.dataset.token;
            }
        });
    });
}

// Initialize trading buttons
function initializeTradingButtons() {
    // Buy button
    const executeBuyBtn = document.getElementById('executeBuy');
    if (executeBuyBtn) {
        executeBuyBtn.addEventListener('click', async () => {
            if (!currentAccount) {
                alert('Please connect your wallet first!');
                return;
            }
            
            const amount = document.getElementById('buyAmount').value;
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            try {
                const amountWei = ethers.utils.parseUnits(amount, 6);
                
                // Approve USDT
                const approveTx = await contracts.USDT.approve(CONTRACT_ADDRESSES.ARUB, amountWei);
                await approveTx.wait();
                
                // Buy ARUB
                const buyTx = await contracts.ARUB.mint(amountWei);
                await buyTx.wait();
                
                alert('Purchase successful!');
                await updatePublicStatistics();
                await updateUserData();
            } catch (error) {
                console.error('Buy error:', error);
                alert('Transaction failed. Please try again.');
            }
        });
    }
    
    // Sell button
    const executeSellBtn = document.getElementById('executeSell');
    if (executeSellBtn) {
        executeSellBtn.addEventListener('click', async () => {
            if (!currentAccount) {
                alert('Please connect your wallet first!');
                return;
            }
            
            const amount = document.getElementById('sellAmount').value;
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            try {
                const amountWei = ethers.utils.parseUnits(amount, 6);
                
                // Sell ARUB
                const sellTx = await contracts.ARUB.burn(amountWei);
                await sellTx.wait();
                
                alert('Sale successful!');
                await updatePublicStatistics();
                await updateUserData();
            } catch (error) {
                console.error('Sell error:', error);
                alert('Transaction failed. Please try again.');
            }
        });
    }
}

// Initialize staking buttons
function initializeStakingButtons() {
    // Stake button
    const executeStakeBtn = document.getElementById('executeStake');
    if (executeStakeBtn) {
        executeStakeBtn.addEventListener('click', async () => {
            if (!currentAccount) {
                alert('Please connect your wallet first!');
                return;
            }
            
            const amount = document.getElementById('stakeAmount').value;
            const activeTokenBtn = document.querySelector('.token-btn.active');
            const token = activeTokenBtn ? activeTokenBtn.dataset.token : 'USDT';
            
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            try {
                const amountWei = ethers.utils.parseUnits(amount, 6);
                const tokenAddress = token === 'USDT' ? CONTRACT_ADDRESSES.USDT : CONTRACT_ADDRESSES.ARUB;
                
                // Approve token
                const tokenContract = token === 'USDT' ? contracts.USDT : contracts.ARUB;
                const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.STAKING, amountWei);
                await approveTx.wait();
                
                // Stake
                const stakeTx = await contracts.Staking.stake(tokenAddress, amountWei);
                await stakeTx.wait();
                
                alert('Staking successful!');
                await updatePublicStatistics();
                await updateUserData();
            } catch (error) {
                console.error('Staking error:', error);
                alert('Transaction failed. Please try again.');
            }
        });
    }
}

// Initialize hero buttons
function initializeHeroButtons() {
    const buyTokensBtn = document.getElementById('buyTokensBtn');
    if (buyTokensBtn) {
        buyTokensBtn.addEventListener('click', () => {
            const tradingSection = document.getElementById('trading');
            if (tradingSection) {
                tradingSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    const stakingBtn = document.getElementById('stakingBtn');
    if (stakingBtn) {
        stakingBtn.addEventListener('click', () => {
            const stakingSection = document.getElementById('staking');
            if (stakingSection) {
                stakingSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Auto-update statistics
function startAutoUpdate() {
    // Update every 30 seconds
    setInterval(async () => {
        await updatePublicStatistics();
        if (currentAccount) {
            await updateUserData();
        }
    }, 30000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing ANTI RUB platform...');
    console.log('📍 Contract addresses:');
    console.log('   ARUB:', CONTRACT_ADDRESSES.ARUB);
    console.log('   USDT:', CONTRACT_ADDRESSES.USDT);
    console.log('   Staking:', CONTRACT_ADDRESSES.STAKING);
    
    // Initialize public provider first
    const providerInitialized = await initializePublicProvider();
    
    if (providerInitialized) {
        // Update public statistics immediately
        await updatePublicStatistics();
    } else {
        // Use demo statistics if provider fails
        console.log('⚠️ Provider initialization failed, using demo data');
        setDemoStatistics();
    }
    
    // Initialize UI components
    initializeWallet();
    calculateTokenAmounts();
    initializeTokenSelection();
    initializeTradingButtons();
    initializeStakingButtons();
    initializeHeroButtons();
    
    // Start auto-update
    startAutoUpdate();
    
    // Check if wallet is already connected
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
                await connectWallet('metamask');
            }
        } catch (error) {
            console.log('No wallet connected yet');
        }
    }
});

// Export for debugging
window.debugStats = {
    updateStats: updatePublicStatistics,
    getBlockchainData: getBlockchainData,
    contracts: contracts,
    provider: publicProvider
};
