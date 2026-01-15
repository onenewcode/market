#[cfg(test)]
mod tests {
    use crate::ID as PROGRAM_ID;
    use crate::constants::{SEED_IDENTITY, SEED_SCORE};
    use crate::state::{IdentityAccount, CreditScoreAccount, ScoreLevel};
    use anchor_lang::{AccountDeserialize, AnchorSerialize};
    use litesvm::LiteSVM;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program,
        transaction::Transaction,
        hash::hash,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    fn get_discriminator(name: &str) -> [u8; 8] {
        let preimage = format!("global:{}", name);
        let mut sighash = [0u8; 8];
        sighash.copy_from_slice(&hash(preimage.as_bytes()).to_bytes()[..8]);
        sighash
    }

    fn get_identity_pda(owner: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[SEED_IDENTITY, owner.as_ref()], &PROGRAM_ID)
    }

    fn get_score_pda(owner: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[SEED_SCORE, owner.as_ref()], &PROGRAM_ID)
    }

    fn create_identity_ix(owner: &Pubkey, identity: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("create_identity");
        
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator.to_vec(),
        }
    }

    fn verify_identity_ix(owner: &Pubkey, identity: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("verify_identity");
        
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false),
                AccountMeta::new_readonly(*owner, true),
            ],
            data: discriminator.to_vec(),
        }
    }

    fn calculate_score_ix(owner: &Pubkey, identity: &Pubkey, score_account: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("calculate_score");
        
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*score_account, false),
                AccountMeta::new(*identity, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator.to_vec(),
        }
    }

    #[test]
    fn test_create_identity() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/identity_score.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());

        let ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );

        svm.send_transaction(tx).unwrap();

        let account = svm.get_account(&identity_pda).unwrap();
        let mut data_slice = &account.data[..];
        let identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(identity_state.owner, user.pubkey());
        assert_eq!(identity_state.verified, false);
        assert_eq!(identity_state.verified_at, None);
    }

    #[test]
    fn test_verify_identity() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/identity_score.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());

        // Create Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify Identity
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let account = svm.get_account(&identity_pda).unwrap();
        let mut data_slice = &account.data[..];
        let identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(identity_state.verified, true);
        assert!(identity_state.verified_at.is_some());
    }

    #[test]
    fn test_verify_identity_unauthorized() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/identity_score.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        let hacker = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&hacker.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());

        // Create Identity (User)
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify Identity (Hacker attempts to verify User's identity)
        // Note: verify_identity instruction expects 'owner' as signer. 
        // If we pass hacker as owner, it checks identity.owner == hacker, which fails because identity.owner is user.
        let verify_ix = verify_identity_ix(&hacker.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&hacker.pubkey()),
            &[&hacker],
            blockhash,
        );
        let result = svm.send_transaction(tx);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_score_high() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/identity_score.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let user = Keypair::new();
        // Give user 15 SOL (High Score >= 10 SOL)
        svm.airdrop(&user.pubkey(), 15 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create Identity first (required for score calculation)
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Calculate Score
        let calc_ix = calculate_score_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[calc_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let account = svm.get_account(&score_pda).unwrap();
        let mut data_slice = &account.data[..];
        let score_state = CreditScoreAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(score_state.identity, identity_pda);
        assert_eq!(score_state.score, 90);
        assert_eq!(score_state.score_level, ScoreLevel::High);
    }
}
