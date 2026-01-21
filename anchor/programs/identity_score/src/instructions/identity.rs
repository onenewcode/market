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

pub fn delete_identity(ctx: Context<DeleteIdentity>) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let identity = &ctx.accounts.identity;
    let score_account = &ctx.accounts.score_account;

    // Verify score account address manually to allow uninitialized accounts
    let (score_pda, _) = Pubkey::find_program_address(
        &[SEED_SCORE, owner.key().as_ref()],
        ctx.program_id,
    );
    require_keys_eq!(score_account.key(), score_pda, crate::errors::IdentityScoreError::Unauthorized);

    let timestamp = Clock::get()?.unix_timestamp;
    
    // Only process if score account is initialized
    if score_account.data_len() > 0 {
        require_keys_eq!(*score_account.owner, *ctx.program_id, crate::errors::IdentityScoreError::Unauthorized);
        // Deserialize score account to verify identity match
        let mut data_slice = &score_account.data.borrow()[..];
        let score_state = CreditScoreAccount::try_deserialize(&mut data_slice)?;
        
        // Verify score account belongs to this identity
        require!(score_state.identity == identity.key(), crate::errors::IdentityScoreError::Unauthorized);
        
        // Transfer lamports from score account to owner
        let score_lamports = score_account.lamports();
        **score_account.lamports.borrow_mut() = 0;
        **owner.to_account_info().lamports.borrow_mut() += score_lamports;
    }

    emit!(crate::events::IdentityDeleted {
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

#[derive(Accounts)]
pub struct DeleteIdentity<'info> {
    #[account(
        mut,
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        close = owner,
        has_one = owner
    )]
    pub identity: Account<'info, IdentityAccount>,
    
    /// Score account info - verified manually to allow uninitialized account
    /// CHECK: Verified in instruction
    #[account(mut)]
    pub score_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
