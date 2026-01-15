use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;

pub fn calculate_score(ctx: Context<CalculateScore>) -> Result<()> {
    let score_account = &mut ctx.accounts.score_account;
    let owner = &ctx.accounts.owner;
    
    // Calculate score based on lamports
    let lamports = owner.lamports();
    // 1 SOL = 1_000_000_000 lamports
    
    let (score, level) = if lamports >= 10 * 1_000_000_000 {
        (90, ScoreLevel::High)
    } else if lamports >= 1 * 1_000_000_000 {
        (75, ScoreLevel::Medium)
    } else if lamports >= 100_000_000 { // 0.1 SOL
        (60, ScoreLevel::Low)
    } else if lamports >= 10_000_000 { // 0.01 SOL
        (45, ScoreLevel::Low)
    } else {
        (30, ScoreLevel::Low)
    };

    score_account.identity = ctx.accounts.identity.key();
    score_account.score = score;
    score_account.score_level = level;
    score_account.calculated_at = Clock::get()?.unix_timestamp;
    
    Ok(())
}

#[derive(Accounts)]
pub struct CalculateScore<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + 32 + 1 + 1 + 8, // discriminator + pubkey + u8 + enum(1) + i64
        seeds = [SEED_SCORE, owner.key().as_ref()],
        bump
    )]
    pub score_account: Account<'info, CreditScoreAccount>,
    
    #[account(
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
    )]
    pub identity: Account<'info, IdentityAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
