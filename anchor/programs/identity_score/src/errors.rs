use anchor_lang::prelude::*;

#[error_code]
pub enum IdentityScoreError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
