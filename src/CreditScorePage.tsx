import { useState } from "react";
import { getAddressEncoder, getBytesEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";
import { IDENTITY_SCORE_PROGRAM_ADDRESS, SEEDS, rpc } from "./config";
import { fetchMaybeCreditScoreAccount, type CreditScoreAccount } from "./generated/accounts/creditScoreAccount";
import { useCreditScore } from "./hooks/useCreditScore";
import { ScoreLevel } from "./generated/types/scoreLevel";

export function CreditScorePage() {
    const { scoreData, calculating, calculateScore } = useCreditScore();
    
    // Search state
    const [searchAddress, setSearchAddress] = useState("");
    const [searchResult, setSearchResult] = useState<CreditScoreAccount | null>(null);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');

    const handleCalculate = async () => {
        const t0 = performance.now();
        try {
            await calculateScore();
        } catch (e) {
            alert("Failed to calculate score: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            const ms = performance.now() - t0;
            console.log(
                "%c[CreditScore] calculateScore 耗时: " + ms.toFixed(0) + "ms",
                "background:#fff3cd;color:#664d03;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #ffeeba"
            );
        }
    };

    const handleSearch = async () => {
        if (!searchAddress) return;
        setSearchStatus('loading');
        setSearchResult(null);
        try {
            const encoder = new TextEncoder();
            const [scorePda] = await getProgramDerivedAddress({
                programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
                seeds: [
                    getBytesEncoder().encode(encoder.encode(SEEDS.SCORE)),
                    getAddressEncoder().encode(searchAddress as Address),
                ],
            });

            const maybe = await fetchMaybeCreditScoreAccount(rpc, scorePda);
            if (maybe.exists) {
                setSearchResult(maybe.data);
                setSearchStatus('found');
            } else {
                setSearchStatus('not-found');
            }
        } catch (e) {
            console.error(e);
            setSearchStatus('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Credit Score</h2>
            
            {!scoreData ? (
                <div className="text-center py-10 bg-card border border-border-low rounded-xl">
                    <p className="text-muted mb-4">No credit score calculated yet.</p>
                    <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium cursor-pointer"
                    >
                        {calculating ? "Calculating..." : "Calculate Score"}
                    </button>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-border-low pb-4">
                        <span className="text-muted">Current Score</span>
                        <span className="text-4xl font-bold">{scoreData.score}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-border-low pb-4">
                        <span className="text-muted">Level</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${scoreData.scoreLevel === ScoreLevel.High ? 'bg-green-100 text-green-700' : 
                              scoreData.scoreLevel === ScoreLevel.Medium ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'}`}>
                            {ScoreLevel[scoreData.scoreLevel]}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-muted">Last Calculated</span>
                        <span className="text-sm font-mono">
                            {new Date(Number(scoreData.calculatedAt) * 1000).toLocaleString()}
                        </span>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg font-medium cursor-pointer"
                        >
                            {calculating ? "Updating..." : "Recalculate Score"}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold">Check Other Account</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        className="flex-1 bg-background border border-border-low rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searchStatus === 'loading' || !searchAddress}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                    >
                        {searchStatus === 'loading' ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {searchStatus === 'error' && (
                    <div className="text-red-500 text-sm">Invalid address or search failed.</div>
                )}
                
                {searchStatus === 'not-found' && (
                    <div className="text-muted text-sm">No credit score found for this address.</div>
                )}

                {searchResult && (
                    <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border-low space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted text-sm">Score</span>
                            <span className="font-bold">{searchResult.score}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted text-sm">Level</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                ${searchResult.scoreLevel === ScoreLevel.High ? 'bg-green-100 text-green-700' : 
                                  searchResult.scoreLevel === ScoreLevel.Medium ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'}`}>
                                {ScoreLevel[searchResult.scoreLevel]}
                            </span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted text-sm">Updated</span>
                            <span className="font-mono text-xs">
                                {new Date(Number(searchResult.calculatedAt) * 1000).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
