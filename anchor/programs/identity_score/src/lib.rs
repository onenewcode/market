use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
mod tests;

use instructions::*;

declare_id!("8qQcqDRpNQEWPjNz62XHooWKr61Ewd8DHj9j2RU1ePFs");

#[program]
pub mod identity_score {
    use super::*;

    pub fn create_identity(ctx: Context<CreateIdentity>) -> Result<()> {
        instructions::identity::create_identity(ctx)
    }

    pub fn verify_identity(ctx: Context<VerifyIdentity>) -> Result<()> {
        instructions::identity::verify_identity(ctx)
    }

    pub fn unverify_identity(ctx: Context<UnverifyIdentity>) -> Result<()> {
        instructions::identity::unverify_identity(ctx)
    }

    pub fn delete_identity(ctx: Context<DeleteIdentity>) -> Result<()> {
        instructions::identity::delete_identity(ctx)
    }

    pub fn calculate_score(ctx: Context<CalculateScore>) -> Result<()> {
        instructions::score::calculate_score(ctx)
    }

    pub fn delete_score(ctx: Context<DeleteScore>) -> Result<()> {
        instructions::score::delete_score(ctx)
    }
}
