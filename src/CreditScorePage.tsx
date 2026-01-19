import { useState } from "react";
import { getAddressEncoder, getBytesEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";
import { IDENTITY_SCORE_PROGRAM_ADDRESS, SEEDS, rpc } from "./config";
import { fetchMaybeCreditScoreAccount, type CreditScoreAccount } from "./generated/accounts/creditScoreAccount";
import { useCreditScore } from "./hooks/useCreditScore";
import { ScoreLevel } from "./generated/types/scoreLevel";
import { theme } from "./styles/theme";

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
        <div className={theme.layout.pageContainer}>
            <h2 className={theme.typography.h2}>Credit Score</h2>
            
            {!scoreData ? (
                <div className={`${theme.layout.card} text-center py-10`}>
                    <p className={`${theme.typography.body} mb-4`}>No credit score calculated yet.</p>
                    <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className={theme.button.variants.primary}
                    >
                        {calculating ? "Calculating..." : "Calculate Score"}
                    </button>
                </div>
            ) : (
                <div className={`${theme.layout.card} space-y-4`}>
                    <div className={`${theme.layout.flexBetween} border-b border-border-low pb-4`}>
                        <span className={theme.typography.label}>Current Score</span>
                        <span className="text-4xl font-bold">{scoreData.score}</span>
                    </div>
                    
                    <div className={`${theme.layout.flexBetween} border-b border-border-low pb-4`}>
                        <span className={theme.typography.label}>Level</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${scoreData.scoreLevel === ScoreLevel.High ? theme.status.level.high : 
                              scoreData.scoreLevel === ScoreLevel.Medium ? theme.status.level.medium : 
                              theme.status.level.low}`}>
                            {ScoreLevel[scoreData.scoreLevel]}
                        </span>
                    </div>

                    <div className={theme.layout.flexBetween}>
                        <span className={theme.typography.label}>Last Calculated</span>
                        <span className="text-sm font-mono">
                            {new Date(Number(scoreData.calculatedAt) * 1000).toLocaleString()}
                        </span>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className={`${theme.button.variants.secondary} w-full`}
                        >
                            {calculating ? "Updating..." : "Recalculate Score"}
                        </button>
                    </div>
                </div>
            )}

            <div className={`${theme.layout.card} space-y-4`}>
                <h3 className={theme.typography.h3}>Check Other Account</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        className={`${theme.input.base} flex-1 focus:border-primary`}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searchStatus === 'loading' || !searchAddress}
                        className={`${theme.button.variants.primary} text-sm`}
                    >
                        {searchStatus === 'loading' ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {searchStatus === 'error' && (
                    <div className={theme.typography.error}>Invalid address or search failed.</div>
                )}
                
                {searchStatus === 'not-found' && (
                    <div className={theme.typography.label}>No credit score found for this address.</div>
                )}

                {searchResult && (
                    <div className={`${theme.layout.cardCompact} space-y-2 bg-background/50`}>
                        <div className="flex justify-between">
                            <span className={`${theme.typography.label} text-sm`}>Score</span>
                            <span className="font-bold">{searchResult.score}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={`${theme.typography.label} text-sm`}>Level</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                ${searchResult.scoreLevel === ScoreLevel.High ? theme.status.level.high : 
                                  searchResult.scoreLevel === ScoreLevel.Medium ? theme.status.level.medium : 
                                  theme.status.level.low}`}>
                                {ScoreLevel[searchResult.scoreLevel]}
                            </span>
                        </div>
                         <div className="flex justify-between">
                            <span className={`${theme.typography.label} text-sm`}>Updated</span>
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
