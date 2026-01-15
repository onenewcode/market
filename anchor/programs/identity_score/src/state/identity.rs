use anchor_lang::prelude::*;

#[account]
pub struct IdentityAccount {
    pub owner: Pubkey,
    pub created_at: i64,
    pub verified: bool,
    pub verified_at: Option<i64>,
}
