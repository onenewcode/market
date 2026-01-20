use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn create_identity(ctx: Context<CreateIdentity>) -> Result<()> {
    let identity = &mut ctx.accounts.identity;
    let owner = &ctx.accounts.owner;
    let timestamp = Clock::get()?.unix_timestamp;

    identity.owner = owner.key();
    identity.created_at = timestamp;
    identity.verified = false;
    identity.verified_at = None;

    emit!(crate::events::IdentityCreated {
        owner: owner.key(),
        identity: identity.key(),
        timestamp,
    });

    Ok(())
}

pub fn verify_identity(ctx: Context<VerifyIdentity>) -> Result<()> {
    let identity = &mut ctx.accounts.identity;
    let owner = &ctx.accounts.owner;
    let timestamp = Clock::get()?.unix_timestamp;

    identity.verified = true;
    identity.verified_at = Some(timestamp);

    emit!(crate::events::IdentityVerified {
        owner: owner.key(),
        identity: identity.key(),
        timestamp,
    });

    Ok(())
}

pub fn unverify_identity(ctx: Context<UnverifyIdentity>) -> Result<()> {
    let identity = &mut ctx.accounts.identity;
    let owner = &ctx.accounts.owner;
    let timestamp = Clock::get()?.unix_timestamp;

    identity.verified = false;
    identity.verified_at = None;

    emit!(crate::events::IdentityUnverified {
        owner: owner.key(),
        identity: identity.key(),
        timestamp,
    });

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

#[derive(Accounts)]
pub struct UnverifyIdentity<'info> {
    #[account(
        mut,
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub identity: Account<'info, IdentityAccount>,
    pub owner: Signer<'info>,
}
