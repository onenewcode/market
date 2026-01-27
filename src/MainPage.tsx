import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthPage } from "./AuthPage";
import { IdentityPage } from "./IdentityPage";
import { CreditScorePage } from "./CreditScorePage";
import { TransferPage } from "./TransferPage";
import { useWalletConnection } from "@solana/react-hooks";
import { theme } from "./styles/theme";
import { ADMIN_ADDRESS } from "./config";

export function MainPage() {
  const location = useLocation();
  const [page, setPage] = useState("auth");
  const { status, wallet } = useWalletConnection();

  const isAdmin = wallet?.account.address === ADMIN_ADDRESS;

  if (status !== "connected" && page !== "auth") {
    setPage("auth");
  }

  const renderPage = () => {
    switch (page) {
      case "auth":
        return <AuthPage onNavigate={setPage} />;
      case "identity":
        return <IdentityPage />;
      case "credit_score":
        return <CreditScorePage />;
      case "transfer":
        return <TransferPage />;
      default:
        return <AuthPage onNavigate={setPage} />;
    }
  };

  return (
    <div className={theme.layout.mainContainer}>
      <main className={theme.layout.contentWrapper}>
        <header className={theme.layout.header}>
          <h1 className={theme.typography.h1}>Chain Identity & Credit Score</h1>
          <p className={`max-w-3xl ${theme.typography.body}`}>
            Manage your on-chain identity and view your credit score based on
            your wallet activity.
          </p>

          {status === "connected" && (
            <nav className="flex gap-4 mt-4 border-b border-border-low pb-1">
              <button
                onClick={() => setPage("auth")}
                className={`${theme.button.nav.base} ${page === "auth" ? theme.button.nav.active : theme.button.nav.inactive}`}
              >
                Home
              </button>
              <button
                onClick={() => setPage("identity")}
                className={`${theme.button.nav.base} ${page === "identity" ? theme.button.nav.active : theme.button.nav.inactive}`}
              >
                Identity
              </button>
              <button
                onClick={() => setPage("credit_score")}
                className={`${theme.button.nav.base} ${page === "credit_score" ? theme.button.nav.active : theme.button.nav.inactive}`}
              >
                Credit Score
              </button>
              <button
                onClick={() => setPage("transfer")}
                className={`${theme.button.nav.base} ${page === "transfer" ? theme.button.nav.active : theme.button.nav.inactive}`}
              >
                Transfer
              </button>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`${theme.button.nav.base} ${location.pathname === "/admin" ? theme.button.nav.active : theme.button.nav.inactive}`}
                >
                  Admin
                </Link>
              )}
            </nav>
          )}
        </header>

        <section className={theme.layout.section}>{renderPage()}</section>
      </main>
    </div>
  );
}
