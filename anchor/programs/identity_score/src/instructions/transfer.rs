use crate::constants::*;
use crate::errors::IdentityScoreError;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn transfer_identity(ctx: Context<TransferIdentity>) -> Result<()> {
    let old_identity = &ctx.accounts.old_identity;
    let new_identity = &mut ctx.accounts.new_identity;
    let old_owner = &ctx.accounts.old_owner;
    let new_owner = &ctx.accounts.new_owner;
    let timestamp = Clock::get()?.unix_timestamp;

    let old_score = &ctx.accounts.old_score;
    let new_score = &mut ctx.accounts.new_score;

    let mut old_score_key: Option<Pubkey> = None;
    let mut new_score_key: Option<Pubkey> = None;

    new_identity.owner = new_owner.key();
    new_identity.created_at = old_identity.created_at;
    new_identity.verified = old_identity.verified;
    new_identity.verified_at = old_identity.verified_at;

    if old_score.data_len() > 0 {
        let (score_pda, _) =
            Pubkey::find_program_address(&[SEED_SCORE, old_owner.key().as_ref()], ctx.program_id);
        require_keys_eq!(old_score.key(), score_pda, IdentityScoreError::Unauthorized);

        require_keys_eq!(
            *old_score.owner,
            *ctx.program_id,
            IdentityScoreError::Unauthorized
        );

        let mut data_slice = &old_score.data.borrow()[..];
        let score_state = CreditScoreAccount::try_deserialize(&mut data_slice)?;

        require!(
            score_state.identity == old_identity.key(),
            IdentityScoreError::Unauthorized
        );

        new_score.identity = new_identity.key();
        new_score.score = score_state.score;
        new_score.score_level = score_state.score_level;
        new_score.calculated_at = score_state.calculated_at;

        old_score_key = Some(old_score.key());
        new_score_key = Some(new_score.key());

        let score_lamports = old_score.lamports();
        **old_score.lamports.borrow_mut() = 0;
        **old_owner.to_account_info().lamports.borrow_mut() += score_lamports;
    }

    emit!(crate::events::IdentityTransferred {
        old_owner: old_owner.key(),
        new_owner: new_owner.key(),
        old_identity: old_identity.key(),
        new_identity: new_identity.key(),
        old_score: old_score_key,
        new_score: new_score_key,
        timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct TransferIdentity<'info> {
    #[account(
        mut,
        seeds = [SEED_IDENTITY, old_owner.key().as_ref()],
        bump,
        close = old_owner,
        constraint = old_identity.owner == old_owner.key() @ IdentityScoreError::Unauthorized
    )]
    pub old_identity: Account<'info, IdentityAccount>,

    #[account(
        init,
        payer = old_owner,
        space = 8 + 32 + 8 + 1 + 9,
        seeds = [SEED_IDENTITY, new_owner.key().as_ref()],
        bump
    )]
    pub new_identity: Account<'info, IdentityAccount>,

    /// CHECK: This is allowed to be uninitialized.
    /// Address is verified via PDA seeds and additionally in the instruction body.
    /// We only deserialize/process it when `data_len() > 0`.
    #[account(mut)]
    pub old_score: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = old_owner,
        space = 8 + 32 + 1 + 1 + 8,
        seeds = [SEED_SCORE, new_owner.key().as_ref()],
        bump
    )]
    pub new_score: Account<'info, CreditScoreAccount>,

    #[account(mut)]
    pub old_owner: Signer<'info>,

    /// CHECK: The new owner address is provided by the caller.
    /// We only use this address to create the new identity account.
    /// No security checks are needed on this account as it's just a destination address.
    pub new_owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
