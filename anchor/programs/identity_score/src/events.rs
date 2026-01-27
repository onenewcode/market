use crate::state::ScoreLevel;
use anchor_lang::prelude::*;

#[event]
pub struct IdentityCreated {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct IdentityVerified {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct IdentityUnverified {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ScoreCalculated {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub score_account: Pubkey,
    pub score: u8,
    pub score_level: ScoreLevel,
    pub timestamp: i64,
}

#[event]
pub struct IdentityDeleted {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ScoreDeleted {
    pub owner: Pubkey,
    pub identity: Pubkey,
    pub score_account: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct IdentityTransferred {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub old_identity: Pubkey,
    pub new_identity: Pubkey,
    pub old_score: Option<Pubkey>,
    pub new_score: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct TransferInitiated {
    pub from_owner: Pubkey,
    pub to_owner: Pubkey,
    pub identity: Pubkey,
    pub transfer_request: Pubkey,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct TransferClaimed {
    pub from_owner: Pubkey,
    pub to_owner: Pubkey,
    pub old_identity: Pubkey,
    pub new_identity: Pubkey,
    pub old_score: Option<Pubkey>,
    pub new_score: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct TransferCancelled {
    pub from_owner: Pubkey,
    pub to_owner: Pubkey,
    pub identity: Pubkey,
    pub transfer_request: Pubkey,
    pub timestamp: i64,
}
