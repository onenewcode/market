use anchor_lang::prelude::*;

#[account]
pub struct TransferRequest {
    pub from_owner: Pubkey,
    pub to_owner: Pubkey,
    pub identity: Pubkey,
    pub created_at: i64,
    pub expires_at: i64,
}

impl TransferRequest {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8;
}
