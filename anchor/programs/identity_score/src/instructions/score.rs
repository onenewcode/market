use crate::constants::*;
use crate::errors::IdentityScoreError;
use crate::state::*;
use anchor_lang::prelude::*;

/// Calculates credit score based on lamports balance
pub fn calculate_score_from_lamports(lamports: u64) -> (u8, ScoreLevel) {
    if lamports >= 10 * 1_000_000_000 {
        (90, ScoreLevel::High)
    } else if lamports >= 1_000_000_000 {
        (75, ScoreLevel::Medium)
    } else if lamports >= 100_000_000 {
        // 0.1 SOL
        (60, ScoreLevel::Low)
    } else if lamports >= 10_000_000 {
        // 0.01 SOL
        (45, ScoreLevel::Low)
    } else {
        (30, ScoreLevel::Low)
    }
}

pub fn calculate_score(ctx: Context<CalculateScore>) -> Result<()> {
    let score_account = &mut ctx.accounts.score_account;
    let owner = &ctx.accounts.owner;
    let identity = &ctx.accounts.identity;

    // Check if identity is verified
    require!(identity.verified, IdentityScoreError::IdentityNotVerified);

    // Calculate score based on lamports
    let lamports = owner.lamports();
    let (score, level) = calculate_score_from_lamports(lamports);
    let timestamp = Clock::get()?.unix_timestamp;

    score_account.identity = identity.key();
    score_account.score = score;
    score_account.score_level = level;
    score_account.calculated_at = timestamp;

    emit!(crate::events::ScoreCalculated {
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
