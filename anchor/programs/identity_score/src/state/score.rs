use anchor_lang::prelude::*;

#[account]
pub struct CreditScoreAccount {
    pub identity: Pubkey,
    pub score: u8,
    pub score_level: ScoreLevel,
    pub calculated_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ScoreLevel {
    Low,
    Medium,
    High,
}

impl std::fmt::Display for ScoreLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScoreLevel::Low => write!(f, "Low"),
            ScoreLevel::Medium => write!(f, "Medium"),
            ScoreLevel::High => write!(f, "High"),
        }
    }
}
