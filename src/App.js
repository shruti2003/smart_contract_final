import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import './App.css'; // Import custom CSS


function App() {
    const [walletBalance, setWalletBalance] = useState("");
    const [response, setResponse] = useState("");
    const [apy, setApy] = useState(5); // Default APY
    const [tvl, setTvl] = useState(5000); // Default TVL
    const [loading, setLoading] = useState(false); 
    const [txHash, setTxHash] = useState(""); 

    const customerAddress = process.env.REACT_APP_CUSTOMER_ADDRESS; 
    const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_ALCHEMY_URL);

    const privateKey = process.env.REACT_APP_PRIVATE_KEY; 
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = process.env.REACT_APP_VERIFIER_CONTRACT; 
    const abi = [
        "function verifyAndClaim(address customer, uint256 apyThreshold, uint256 tvlThreshold) external",
        "function getCurrentPoolData() external view returns (uint256 tvlInUSD, uint256 apy)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const tokenAddress = process.env.REACT_APP_TOKEN_CONTRACT; 
    const tokenAbi = [
        "function getBalance(address user) external view returns (uint256)"
    ];
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const balance = await tokenContract.getBalance(customerAddress);
            setWalletBalance(ethers.formatUnits(balance, 18));
        } catch (error) {
            console.error("Error fetching balance:", error);
            setWalletBalance("Error!");
        }
    };

    const claimReward = async () => {
        if (!apy || !tvl) {
            setResponse("❌ Set APY & TVL thresholds first!");
            return;
        }

        setLoading(true);
        try {
            const tx = await contract.verifyAndClaim(customerAddress, parseFloat(apy), parseFloat(tvl));
            await tx.wait();

            setTxHash(tx.hash);
            setResponse(`Reward Claimed!`);
            setWalletBalance((prevBalance) => (parseFloat(prevBalance) + 10).toFixed(2));
            setTimeout(fetchBalance, 5000);
        } catch (error) {
            console.error("Error:", error);
            setResponse(`${error.reason || "❌ Transaction failed!"}`);
        }
        setLoading(false);
    };

    return (
        <div className="app-container">
            <h1 className="title">Axal Reward Portal</h1>

            <div className="input-group">
                <label>APY Threshold: {apy}%</label>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                />
            </div>

            <div className="input-group">
                <label>TVL Threshold: ${tvl}</label>
                <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="500"
                    value={tvl}
                    onChange={(e) => setTvl(e.target.value)}
                />
            </div>

            <p className="balance">Wallet Balance: <span>{walletBalance} AXAL</span></p>

            <button className="claim-btn" onClick={claimReward} disabled={loading}>
                {loading ? "Processing..." : "Claim Ticket"}
            </button>

            {response && (
                <div className="response-container">
                    <p className={response.includes("❌") ? "error-text" : "success-text"}>{response}</p>
                    {txHash && (
                        <p>
                            <a 
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="etherscan-link"
                            >
                                View on Etherscan
                            </a>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;