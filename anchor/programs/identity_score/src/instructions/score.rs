use crate::constants::*;
use crate::errors::IdentityScoreError;
use crate::events;
use crate::state::*;
use anchor_lang::prelude::*;

const LN_MAX_LAMPORTS: f64 = 23.025850929940457;
const MAX_AGE_SECONDS: i64 = 365 * 24 * 60 * 60;
const RENT_EXEMPT_PER_BYTE: u64 = 2_000_000;

const WEIGHT_ASSET: f64 = 0.4;
const WEIGHT_STABILITY: f64 = 0.3;
const WEIGHT_RENT_EFFICIENCY: f64 = 0.2;
const WEIGHT_VERIFICATION: f64 = 0.1;

const SCORE_MIN: f64 = 30.0;
const SCORE_RANGE: f64 = 60.0;

fn normalize_score(normalized: f64) -> u8 {
    (SCORE_MIN + SCORE_RANGE * normalized.clamp(0.0, 1.0)) as u8
}

pub fn calculate_comprehensive_score(
    lamports: u64,
    identity_created_at: i64,
    is_verified: bool,
    account_data_len: u64,
    current_timestamp: i64,
) -> (u8, ScoreLevel) {
    let total_score = (calculate_asset_score(lamports) as f64 * WEIGHT_ASSET
        + calculate_stability_score(identity_created_at, is_verified, current_timestamp) as f64
            * WEIGHT_STABILITY
        + calculate_rent_efficiency_score(lamports, account_data_len) as f64
            * WEIGHT_RENT_EFFICIENCY
        + calculate_verification_score(is_verified) as f64 * WEIGHT_VERIFICATION)
        as u8;

    let level = if total_score >= 70 {
        ScoreLevel::High
    } else if total_score >= 50 {
        ScoreLevel::Medium
    } else {
        ScoreLevel::Low
    };

    (total_score, level)
}

fn calculate_asset_score(lamports: u64) -> u8 {
    if lamports == 0 {
        return SCORE_MIN as u8;
    }
    normalize_score((lamports as f64).ln() / LN_MAX_LAMPORTS)
}

fn calculate_stability_score(
    identity_created_at: i64,
    is_verified: bool,
    current_timestamp: i64,
) -> u8 {
    let age_seconds = (current_timestamp - identity_created_at).max(0);
    let age_score = ((age_seconds as f64 / MAX_AGE_SECONDS as f64).clamp(0.0, 1.0) * 60.0) as u8;
    (age_score + if is_verified { 30 } else { 0 }).min(90)
}

fn calculate_rent_efficiency_score(lamports: u64, account_data_len: u64) -> u8 {
    let rent_exempt = (account_data_len as u64 * RENT_EXEMPT_PER_BYTE).max(RENT_EXEMPT_PER_BYTE);
    let ratio = (lamports as f64 / rent_exempt as f64).clamp(1.0, 10.0);
    normalize_score((ratio - 1.0) / 9.0)
}

fn calculate_verification_score(is_verified: bool) -> u8 {
    if is_verified {
        90
    } else {
        50
    }
}

pub fn calculate_score_from_lamports(lamports: u64) -> (u8, ScoreLevel) {
    calculate_comprehensive_score(lamports, 0, true, 100, Clock::get().unwrap().unix_timestamp)
}

pub fn calculate_score(ctx: Context<CalculateScore>) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let identity = &ctx.accounts.identity;
    let data_len = ctx.accounts.score_account.to_account_info().data_len() as u64;

    require!(identity.verified, IdentityScoreError::IdentityNotVerified);

    let lamports = owner.lamports();
    let timestamp = Clock::get()?.unix_timestamp;

    let (score, level) = calculate_comprehensive_score(
        lamports,
        identity.created_at,
        identity.verified,
        data_len,
        timestamp,
    );

    let score_account = &mut ctx.accounts.score_account;

    score_account.identity = identity.key();
    score_account.score = score;
    score_account.score_level = level;
    score_account.calculated_at = timestamp;

    emit!(events::ScoreCalculated {
        owner: owner.key(),
        identity: identity.key(),
        score_account: score_account.key(),
        score,
        score_level: level,
        timestamp,
    });

    Ok(())
}

pub fn delete_score(ctx: Context<DeleteScore>) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let identity = &ctx.accounts.identity;
    let score_account = &mut ctx.accounts.score_account;
    let timestamp = Clock::get()?.unix_timestamp;

    // Verify score account address manually to allow uninitialized accounts
    let (score_pda, _) =
        Pubkey::find_program_address(&[SEED_SCORE, owner.key().as_ref()], ctx.program_id);
    require_keys_eq!(
        score_account.key(),
        score_pda,
        IdentityScoreError::Unauthorized
    );

    // Only process if score account is initialized
    if score_account.data_len() > 0 {
        require_keys_eq!(
            *score_account.owner,
            *ctx.program_id,
            IdentityScoreError::Unauthorized
        );
        // Deserialize score account to verify identity match
        let mut data_slice = &score_account.data.borrow()[..];
        let score_state = CreditScoreAccount::try_deserialize(&mut data_slice)?;

        // Verify score account belongs to this identity
        require!(
            score_state.identity == identity.key(),
            crate::errors::IdentityScoreError::Unauthorized
        );

        // Transfer lamports from score account to owner
        let score_lamports = score_account.lamports();
        **score_account.lamports.borrow_mut() = 0;
        **owner.to_account_info().lamports.borrow_mut() += score_lamports;
    }

    emit!(crate::events::ScoreDeleted {
        owner: owner.key(),
        identity: identity.key(),
        score_account: score_account.key(),
        timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CalculateScore<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + 32 + 1 + 1 + 8, // discriminator + pubkey + u8 + enum(1) + i64
        seeds = [SEED_SCORE, owner.key().as_ref()],
        bump,
    )]
    pub score_account: Account<'info, CreditScoreAccount>,

    #[account(
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub identity: Account<'info, IdentityAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteScore<'info> {
    /// CHECK: This is allowed to be uninitialized.
    /// Address is verified via PDA seeds and additionally in the instruction body.
    /// We only deserialize/process it when `data_len() > 0`.
    #[account(mut)]
    pub score_account: AccountInfo<'info>,

    #[account(
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub identity: Account<'info, IdentityAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
