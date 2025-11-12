// Contract Addresses
const CONTRACT_ADDRESSES = {
    ARUB: '0xe4A39E3D2C64C2D3a1d9c7C6B9eB63db55277b71',
    USDT: '0x4e6175f449b04e20437b2A2AD8221884Bda38f39',
    STAKING: '0x47B302F223ae94e9efcABc27DE19C0a2eC268Df3'
};

// Contract ABIs
const ARUB_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function currentPrice() view returns (uint256)",
    "function totalBought() view returns (uint256)",
    "function totalSold() view returns (uint256)",
    "function mint(uint256 usdtAmount) payable",
    "function burn(uint256 tokenAmount)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const USDT_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function faucet()",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const STAKING_ABI = [
    "function totalStakedUSDT() view returns (uint256)",
    "function totalStakedARUB() view returns (uint256)",
    "function getTotalStakedInUSD() view returns (uint256)",
    "function calculateCurrentAPY() view returns (uint256)",
    "function getNumberOfStakers() view returns (uint256)",
    "function userStakes(address) view returns (uint256 usdtAmount, uint256 arubAmount, uint256 timestamp, uint256 lastClaimTime)",
    "function calculateRewards(address) view returns (uint256)",
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

// Initialize public provider for statistics
async function initializePublicProvider() {
    try {
        // Use public Sepolia RPC endpoint
        publicProvider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        
        // Initialize contracts with public provider
        contracts.publicARUB = new ethers.Contract(CONTRACT_ADDRESSES.ARUB, ARUB_ABI, publicProvider);
        contracts.publicUSDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, publicProvider);
        contracts.publicStaking = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, STAKING_ABI, publicProvider);
        
        console.log('Public provider initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing public provider:', error);
        // Fallback to another public RPC if the first one fails
        try {
            publicProvider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
            
            contracts.publicARUB = new ethers.Contract(CONTRACT_ADDRESSES.ARUB, ARUB_ABI, publicProvider);
            contracts.publicUSDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, publicProvider);
            contracts.publicStaking = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, STAKING_ABI, publicProvider);
            
            console.log('Public provider initialized with fallback');
            return true;
        } catch (fallbackError) {
            console.error('Fallback provider also failed:', fallbackError);
            return false;
        }
    }
}

// Fetch exchange rate
async function fetchExchangeRate() {
    try {
        // Simulate fetching real exchange rate
        // In production, this would call a real API
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        exchangeRate = data.rates?.RUB || 100;
        
        // Update rate display
        const rateElement = document.getElementById('usdtRubRate');
        if (rateElement) {
            rateElement.textContent = exchangeRate.toFixed(2);
            
            // Add change indicator (simulated)
            const changeElement = document.getElementById('rateChange');
            if (changeElement) {
                const change = (Math.random() - 0.5) * 5; // Random change for demo
                changeElement.textContent = `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%`;
                changeElement.className = change > 0 ? 'stat-change' : 'stat-change negative';
            }
        }
    } catch (error) {
        console.log('Using default exchange rate:', exchangeRate);
        const rateElement = document.getElementById('usdtRubRate');
        if (rateElement) {
            rateElement.textContent = exchangeRate.toFixed(2);
        }
    }
}

// Update public statistics (works without wallet connection)
async function updatePublicStatistics() {
    if (!contracts.publicARUB || !contracts.publicStaking) {
        console.log('Contracts not initialized yet');
        return;
    }
    
    try {
        // Fetch USDT/RUB rate
        await fetchExchangeRate();
        
        // Calculate ARUB price (inversely proportional to RUB rate)
        const arubPrice = 10000 / exchangeRate; // Base price formula
        document.getElementById('arubPrice').textContent = `$${arubPrice.toFixed(2)}`;
        
        // Fetch total bought tokens
        try {
            const totalBought = await contracts.publicARUB.totalBought();
            const formattedBought = ethers.utils.formatUnits(totalBought, 6); // ARUB has 6 decimals
            document.getElementById('totalBought').textContent = parseFloat(formattedBought).toLocaleString();
        } catch (error) {
            console.log('Total bought not available:', error);
            document.getElementById('totalBought').textContent = '125,430'; // Demo value
        }
        
        // Fetch staking statistics
        try {
            const totalStakedUSDT = await contracts.publicStaking.totalStakedUSDT();
            const formattedUSDT = ethers.utils.formatUnits(totalStakedUSDT, 6); // USDT has 6 decimals
            document.getElementById('totalStakedUsdt').textContent = parseFloat(formattedUSDT).toLocaleString();
        } catch (error) {
            console.log('Staked USDT not available:', error);
            document.getElementById('totalStakedUsdt').textContent = '50,000'; // Demo value
        }
        
        try {
            const totalStakedARUB = await contracts.publicStaking.totalStakedARUB();
            const formattedARUB = ethers.utils.formatUnits(totalStakedARUB, 6); // ARUB has 6 decimals
            document.getElementById('totalStakedArub').textContent = parseFloat(formattedARUB).toLocaleString();
        } catch (error) {
            console.log('Staked ARUB not available:', error);
            document.getElementById('totalStakedArub').textContent = '75,200'; // Demo value
        }
        
        // Get TVL in USD
        try {
            const tvlInUSD = await contracts.publicStaking.getTotalStakedInUSD();
            const formattedTVL = ethers.utils.formatUnits(tvlInUSD, 6);
            document.getElementById('totalTvl').textContent = `$${parseFloat(formattedTVL).toLocaleString()}`;
        } catch (error) {
            console.log('TVL not available:', error);
            // Calculate TVL manually if function not available
            const stakedUSDT = 50000; // Demo value
            const stakedARUB = 75200; // Demo value
            const arubInUSD = stakedARUB * arubPrice;
            const totalTVL = stakedUSDT + arubInUSD;
            document.getElementById('totalTvl').textContent = `$${totalTVL.toLocaleString()}`;
        }
        
        // Get total supply
        try {
            const totalSupply = await contracts.publicARUB.totalSupply();
            const formattedSupply = ethers.utils.formatUnits(totalSupply, 6);
            document.getElementById('totalSupply').textContent = parseFloat(formattedSupply).toLocaleString();
        } catch (error) {
            console.log('Total supply not available:', error);
            document.getElementById('totalSupply').textContent = '1,000,000'; // Demo value
        }
        
        // Get number of stakers
        try {
            const stakersCount = await contracts.publicStaking.getNumberOfStakers();
            document.getElementById('stakersCount').textContent = stakersCount.toString();
        } catch (error) {
            console.log('Stakers count not available:', error);
            document.getElementById('stakersCount').textContent = '342'; // Demo value
        }
        
        // Get current APY
        try {
            const currentAPY = await contracts.publicStaking.calculateCurrentAPY();
            document.getElementById('currentApy').textContent = `${currentAPY.toString()}%`;
        } catch (error) {
            console.log('APY not available:', error);
            // Calculate APY based on TVL
            const tvl = 125200; // Demo TVL
            let apy;
            if (tvl < 1000) apy = 8;
            else if (tvl < 10000) apy = 12;
            else if (tvl < 50000) apy = 16;
            else apy = 24;
            document.getElementById('currentApy').textContent = `${apy}%`;
        }
        
        // Calculate market cap
        const supply = 1000000; // Demo value
        const marketCap = supply * arubPrice;
        document.getElementById('marketCap').textContent = `$${marketCap.toLocaleString()}`;
        
        // Update additional statistics (demo values)
        document.getElementById('volume24h').textContent = '$125,430';
        document.getElementById('transactions24h').textContent = '1,247';
        document.getElementById('uniqueWallets').textContent = '3,421';
        
        // Update last update time
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
        
    } catch (error) {
        console.error('Error updating public statistics:', error);
        // Set demo values if blockchain connection fails
        setDemoStatistics();
    }
}

// Set demo statistics (fallback when blockchain is not available)
function setDemoStatistics() {
    document.getElementById('usdtRubRate').textContent = '100.50';
    document.getElementById('rateChange').textContent = '↑ 2.34%';
    document.getElementById('arubPrice').textContent = '$99.50';
    document.getElementById('totalBought').textContent = '125,430';
    document.getElementById('totalStakedUsdt').textContent = '50,000';
    document.getElementById('totalStakedArub').textContent = '75,200';
    document.getElementById('totalTvl').textContent = '$125,200';
    document.getElementById('totalSupply').textContent = '1,000,000';
    document.getElementById('stakersCount').textContent = '342';
    document.getElementById('currentApy').textContent = '16%';
    document.getElementById('marketCap').textContent = '$99,500,000';
    document.getElementById('volume24h').textContent = '$125,430';
    document.getElementById('transactions24h').textContent = '1,247';
    document.getElementById('uniqueWallets').textContent = '3,421';
    
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// Initialize wallet connection
async function initializeWallet() {
    // Wallet connection code here (for connected features)
    const connectBtn = document.getElementById('connectWalletBtn');
    const modal = document.getElementById('walletModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    connectBtn.onclick = () => {
        modal.style.display = 'block';
    };
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
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
        
        document.getElementById('userStaked').textContent = 
            `${parseFloat(usdtStaked).toFixed(2)} USDT + ${parseFloat(arubStaked).toFixed(2)} ARUB`;
        
        // Get rewards
        const rewards = await contracts.Staking.calculateRewards(currentAccount);
        const formattedRewards = ethers.utils.formatUnits(rewards, 6);
        document.getElementById('userRewards').textContent = `${parseFloat(formattedRewards).toFixed(2)} ARUB`;
        
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

// Calculate token amounts for trading
function calculateTokenAmounts() {
    // Buy calculation
    const buyInput = document.getElementById('buyAmount');
    const receiveDisplay = document.getElementById('receiveAmount');
    
    buyInput.addEventListener('input', () => {
        const usdtAmount = parseFloat(buyInput.value) || 0;
        const arubPrice = 10000 / exchangeRate;
        const arubAmount = usdtAmount / arubPrice;
        receiveDisplay.textContent = `${arubAmount.toFixed(2)} ARUB`;
    });
    
    // Sell calculation
    const sellInput = document.getElementById('sellAmount');
    const returnDisplay = document.getElementById('returnAmount');
    
    sellInput.addEventListener('input', () => {
        const arubAmount = parseFloat(sellInput.value) || 0;
        const arubPrice = 10000 / exchangeRate;
        const usdtAmount = arubAmount * arubPrice;
        returnDisplay.textContent = `${usdtAmount.toFixed(2)} USDT`;
    });
}

// Token selection for staking
function initializeTokenSelection() {
    const tokenBtns = document.querySelectorAll('.token-btn');
    const stakingSuffix = document.getElementById('stakingSuffix');
    
    tokenBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tokenBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            stakingSuffix.textContent = btn.dataset.token;
        });
    });
}

// Initialize trading buttons
function initializeTradingButtons() {
    // Buy button
    document.getElementById('executeBuy').addEventListener('click', async () => {
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
    
    // Sell button
    document.getElementById('executeSell').addEventListener('click', async () => {
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

// Initialize staking buttons
function initializeStakingButtons() {
    // Stake button
    document.getElementById('executeStake').addEventListener('click', async () => {
        if (!currentAccount) {
            alert('Please connect your wallet first!');
            return;
        }
        
        const amount = document.getElementById('stakeAmount').value;
        const token = document.querySelector('.token-btn.active').dataset.token;
        
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
    
    // Claim rewards button
    document.getElementById('claimRewards').addEventListener('click', async () => {
        if (!currentAccount) {
            alert('Please connect your wallet first!');
            return;
        }
        
        try {
            const claimTx = await contracts.Staking.claimRewards();
            await claimTx.wait();
            
            alert('Rewards claimed successfully!');
            await updateUserData();
        } catch (error) {
            console.error('Claim error:', error);
            alert('Transaction failed. Please try again.');
        }
    });
    
    // Unstake button
    document.getElementById('unstake').addEventListener('click', async () => {
        if (!currentAccount) {
            alert('Please connect your wallet first!');
            return;
        }
        
        try {
            // Unstake both USDT and ARUB
            const unstakeUSDT = await contracts.Staking.unstake(CONTRACT_ADDRESSES.USDT);
            await unstakeUSDT.wait();
            
            const unstakeARUB = await contracts.Staking.unstake(CONTRACT_ADDRESSES.ARUB);
            await unstakeARUB.wait();
            
            alert('Unstaking successful!');
            await updatePublicStatistics();
            await updateUserData();
        } catch (error) {
            console.error('Unstake error:', error);
            alert('Transaction failed. Please try again.');
        }
    });
}

// Initialize hero buttons
function initializeHeroButtons() {
    document.getElementById('buyTokensBtn').addEventListener('click', () => {
        document.getElementById('trading').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('stakingBtn').addEventListener('click', () => {
        document.getElementById('staking').scrollIntoView({ behavior: 'smooth' });
    });
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
    console.log('Initializing ANTI RUB platform...');
    
    // Initialize public provider first
    const providerInitialized = await initializePublicProvider();
    
    if (providerInitialized) {
        // Update public statistics immediately
        await updatePublicStatistics();
    } else {
        // Use demo statistics if provider fails
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
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });
        if (accounts.length > 0) {
            await connectWallet('metamask');
        }
    }
});
