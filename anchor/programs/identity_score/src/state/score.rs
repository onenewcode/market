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
