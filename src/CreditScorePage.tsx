import { useState } from "react";
import { type Address } from "@solana/kit";
import { rpc } from "./config";
import {
  fetchMaybeCreditScoreAccount,
  type CreditScoreAccount,
} from "./generated/accounts/creditScoreAccount";
import { useCreditScore } from "./hooks/useCreditScore";
import { ScoreLevel } from "./generated/types/scoreLevel";
import { theme } from "./styles/theme";
import { useAlert } from "./hooks/useAlert";
import { Input } from "./components/ui/Input";
import { ActionButton } from "./components/ui/ActionButton";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { usePda } from "./hooks/usePda";
import { getErrorMessage } from "./utils/error";
import { formatTimestamp } from "./utils/time";
import { useAsyncOperation } from "./hooks/useAsyncOperation";
import { useConfirmModal } from "./hooks/useConfirmModal";

export function CreditScorePage() {
  const { scoreData, calculating, calculateScore, deleteScore, deleting } =
    useCreditScore();
  const { showAlert } = useAlert();
  const { getScorePda } = usePda();
  const { execute } = useAsyncOperation();
  const { modalState, openModal, closeModal, setLoading } = useConfirmModal();

  const [searchAddress, setSearchAddress] = useState("");
  const [searchResult, setSearchResult] = useState<CreditScoreAccount | null>(
    null
  );
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "found" | "not-found" | "error"
  >("idle");

  const handleCalculate = async () => {
    const t0 = performance.now();
    await execute(() => calculateScore(), {
      successMessage: "Credit score calculated successfully",
      errorMessage: "Failed to calculate score",
      showSuccessAlert: false,
    }).then((result) => {
      if (result === null) {
        const errorMsg = getErrorMessage(new Error("Calculation failed"));
        if (errorMsg.includes("Identity not verified")) {
          showAlert(
            "Verification Required",
            "Please verify your identity first before calculating your credit score.",
            { variant: "warning" }
          );
        }
      }
    });
    const ms = performance.now() - t0;
    console.log(
      "%c[CreditScore] calculateScore 耗时: " + ms.toFixed(0) + "ms",
      "background:#fff3cd;color:#664d03;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #ffeeba"
    );
  };

  const handleDeleteScore = async () => {
    openModal({
      title: "Delete Credit Score",
      message:
        "Are you sure you want to delete your credit score? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        const result = await execute(() => deleteScore(), {
          successMessage: "Credit score deleted successfully",
          errorMessage: "Failed to delete score",
        });
        setLoading(false);
        if (result !== null) {
          closeModal();
        }
      },
    });
  };

  const handleSearch = async () => {
    if (!searchAddress) return;
    setSearchStatus("loading");
    setSearchResult(null);
    try {
      const scorePda = await getScorePda(searchAddress as Address);
      const maybe = await fetchMaybeCreditScoreAccount(rpc, scorePda);
      if (maybe.exists) {
        setSearchResult(maybe.data);
        setSearchStatus("found");
      } else {
        setSearchStatus("not-found");
      }
    } catch (e) {
      console.error(e);
      setSearchStatus("error");
    }
  };

  return (
    <div className={theme.layout.pageContainer}>
      <h2 className={theme.typography.h2}>Credit Score</h2>

      {!scoreData ? (
        <div className={`${theme.layout.card} text-center py-10`}>
          <p className={`${theme.typography.body} mb-4`}>
            No credit score calculated yet.
          </p>
          <ActionButton
            label="Calculate Score"
            loading={calculating}
            loadingLabel="Calculating..."
            onClick={handleCalculate}
          />
        </div>
      ) : (
        <div className={`${theme.layout.card} space-y-4`}>
          <div
            className={`${theme.layout.flexBetween} border-b border-border-low pb-4`}
          >
            <span className={theme.typography.label}>Current Score</span>
            <span className="text-4xl font-bold">{scoreData.score}</span>
          </div>

          <div
            className={`${theme.layout.flexBetween} border-b border-border-low pb-4`}
          >
            <span className={theme.typography.label}>Level</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                scoreData.scoreLevel === ScoreLevel.High
                  ? theme.status.level.high
                  : scoreData.scoreLevel === ScoreLevel.Medium
                    ? theme.status.level.medium
                    : theme.status.level.low
              }`}
            >
              {ScoreLevel[scoreData.scoreLevel]}
            </span>
          </div>

          <div className={theme.layout.flexBetween}>
            <span className={theme.typography.label}>Last Calculated</span>
            <span className="text-sm font-mono">
              {formatTimestamp(scoreData.calculatedAt)}
            </span>
          </div>

          <div className="pt-4 space-y-3">
            <ActionButton
              label="Recalculate Score"
              loading={calculating}
              loadingLabel="Updating..."
              variant="secondary"
              onClick={handleCalculate}
            />
            <ActionButton
              label="Delete Score"
              loading={deleting}
              loadingLabel="Deleting..."
              variant="danger"
              onClick={handleDeleteScore}
            />
          </div>
        </div>
      )}

      <div className={`${theme.layout.card} space-y-4`}>
        <h3 className={theme.typography.h3}>Check Other Account</h3>
        <div className="flex gap-2">
          <Input
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="flex-1"
          />
          <ActionButton
            label="Search"
            loading={searchStatus === "loading"}
            loadingLabel="Searching..."
            disabled={!searchAddress}
            onClick={handleSearch}
          />
        </div>

        {searchStatus === "error" && (
          <div className={theme.typography.error}>
            Invalid address or search failed.
          </div>
        )}

        {searchStatus === "not-found" && (
          <div className={theme.typography.label}>
            No credit score found for this address.
          </div>
        )}

        {searchResult && (
          <div
            className={`${theme.layout.cardCompact} space-y-2 bg-background/50`}
          >
            <div className="flex justify-between">
              <span className={`${theme.typography.label} text-sm`}>Score</span>
              <span className="font-bold">{searchResult.score}</span>
            </div>
            <div className="flex justify-between">
              <span className={`${theme.typography.label} text-sm`}>Level</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  searchResult.scoreLevel === ScoreLevel.High
                    ? theme.status.level.high
                    : searchResult.scoreLevel === ScoreLevel.Medium
                      ? theme.status.level.medium
                      : theme.status.level.low
                }`}
              >
                {ScoreLevel[searchResult.scoreLevel]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={`${theme.typography.label} text-sm`}>
                Updated
              </span>
              <span className="font-mono text-xs">
                {formatTimestamp(searchResult.calculatedAt)}
              </span>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        variant={modalState.variant}
        onConfirm={modalState.onConfirm}
        onCancel={closeModal}
        loading={modalState.loading}
      />
    </div>
  );
}
