import { useState } from "react";
import { AuthPage } from "./AuthPage";
import { IdentityPage } from "./IdentityPage";
import { CreditScorePage } from "./CreditScorePage";
import { useWalletConnection } from "@solana/react-hooks";

export default function App() {
  const [page, setPage] = useState("auth");
  const { status } = useWalletConnection();

  // Redirect to auth if not connected, unless we are on auth page
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
      default:
        return <AuthPage onNavigate={setPage} />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Chain Identity & Credit Score
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Manage your on-chain identity and view your credit score based on your wallet activity.
          </p>
          
          {status === "connected" && (
            <nav className="flex gap-4 mt-4 border-b border-border-low pb-1">
                <button 
                    onClick={() => setPage("auth")}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${page === "auth" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
                >
                    Home
                </button>
                <button 
                    onClick={() => setPage("identity")}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${page === "identity" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
                >
                    Identity
                </button>
                <button 
                    onClick={() => setPage("credit_score")}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${page === "credit_score" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
                >
                    Credit Score
                </button>
            </nav>
          )}
        </header>

        <section className="w-full max-w-3xl">
          {renderPage()}
        </section>
      </main>
    </div>
  );
}
