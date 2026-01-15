use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

pub fn create_identity(ctx: Context<CreateIdentity>) -> Result<()> {
    let identity = &mut ctx.accounts.identity;
    identity.owner = ctx.accounts.owner.key();
    identity.created_at = Clock::get()?.unix_timestamp;
    identity.verified = false;
    identity.verified_at = None;
    Ok(())
}

pub fn verify_identity(ctx: Context<VerifyIdentity>) -> Result<()> {
    let identity = &mut ctx.accounts.identity;
    require!(identity.owner == ctx.accounts.owner.key(), IdentityScoreError::Unauthorized);
    identity.verified = true;
    identity.verified_at = Some(Clock::get()?.unix_timestamp);
    Ok(())
}

#[derive(Accounts)]
pub struct CreateIdentity<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 8 + 1 + 9, // discriminator + pubkey + i64 + bool + Option<i64>
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, IdentityAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyIdentity<'info> {
    #[account(
        mut,
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub identity: Account<'info, IdentityAccount>,
    pub owner: Signer<'info>,
}
