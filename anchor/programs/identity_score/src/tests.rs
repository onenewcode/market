#[cfg(test)]
mod tests {
    use crate::constants::{SEED_IDENTITY, SEED_SCORE};
    use crate::state::{CreditScoreAccount, IdentityAccount, ScoreLevel};
    use crate::ID as PROGRAM_ID;
    use anchor_lang::AccountDeserialize;
    use litesvm::LiteSVM;
    use solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        transaction::Transaction,
    };
    use solana_system_interface::program;

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
        let (_, bump) = get_identity_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false), // new(pubkey, is_signer) creates writable account
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data,
        }
    }

    fn verify_identity_ix(owner: &Pubkey, identity: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("verify_identity");
        let (_, bump) = get_identity_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false), // new(pubkey, is_signer) creates writable account
                AccountMeta::new_readonly(*owner, true),
            ],
            data,
        }
    }

    fn calculate_score_ix(
        owner: &Pubkey,
        identity: &Pubkey,
        score_account: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("calculate_score");
        let (_, score_bump) = get_score_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(score_bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*score_account, false),
                AccountMeta::new(*identity, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data,
        }
    }

    fn unverify_identity_ix(owner: &Pubkey, identity: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("unverify_identity");
        let (_, bump) = get_identity_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false), // new(pubkey, is_signer) creates writable account
                AccountMeta::new_readonly(*owner, true),
            ],
            data,
        }
    }

    fn delete_identity_ix(
        owner: &Pubkey,
        identity: &Pubkey,
        score_account: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("delete_identity");
        let (_, identity_bump) = get_identity_pda(owner);
        let (_, score_bump) = get_score_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(identity_bump);
        data.push(score_bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false),
                AccountMeta::new(*score_account, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data,
        }
    }

    fn delete_score_ix(owner: &Pubkey, identity: &Pubkey, score_account: &Pubkey) -> Instruction {
        let discriminator = get_discriminator("delete_score");
        let (_, score_bump) = get_score_pda(owner);

        let mut data = discriminator.to_vec();
        data.push(score_bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*score_account, false),
                AccountMeta::new(*identity, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data,
        }
    }

    fn transfer_identity_ix(
        old_owner: &Pubkey,
        new_owner: &Pubkey,
        old_identity: &Pubkey,
        new_identity: &Pubkey,
        old_score: &Pubkey,
        new_score: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("transfer_identity");
        let (_, old_identity_bump) = get_identity_pda(old_owner);
        let (_, new_identity_bump) = get_identity_pda(new_owner);
        let (_, old_score_bump) = get_score_pda(old_owner);
        let (_, new_score_bump) = get_score_pda(new_owner);

        let mut data = discriminator.to_vec();
        data.push(old_identity_bump);
        data.push(new_identity_bump);
        data.push(old_score_bump);
        data.push(new_score_bump);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*old_identity, false),
                AccountMeta::new(*new_identity, false),
                AccountMeta::new(*old_score, false),
                AccountMeta::new(*new_score, false),
                AccountMeta::new(*old_owner, true),
                AccountMeta::new_readonly(*new_owner, false),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data,
        }
    }

    /// Helper function to initialize test environment with loaded program
    fn setup_test_environment() -> LiteSVM {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/identity_score.so");
        match svm.add_program(PROGRAM_ID, program_bytes) {
            Ok(_) => svm,
            Err(e) => {
                println!("Error adding program: {:?}", e);
                panic!("Failed to add program to LiteSVM");
            }
        }
    }

    #[test]
    fn test_create_identity() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());

        let ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx =
            Transaction::new_signed_with_payer(&[ix], Some(&user.pubkey()), &[&user], blockhash);

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
        let mut svm = setup_test_environment();

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
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        let hacker = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&hacker.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

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
        let mut svm = setup_test_environment();

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

        // Verify Identity first
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
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

    #[test]
    fn test_unverify_identity() {
        let mut svm = setup_test_environment();

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

        // Unverify Identity
        let unverify_ix = unverify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[unverify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Check if identity is unverified
        let account = svm.get_account(&identity_pda).unwrap();
        let mut data_slice = &account.data[..];
        let identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(identity_state.verified, false);
        assert_eq!(identity_state.verified_at, None);
    }

    #[test]
    fn test_calculate_score_medium() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        // Give user 5 SOL (Medium Score >= 1 SOL)
        svm.airdrop(&user.pubkey(), 5 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
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
        assert_eq!(score_state.score, 75);
        assert_eq!(score_state.score_level, ScoreLevel::Medium);
    }

    #[test]
    fn test_calculate_score_low() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        // Give user 0.5 SOL (Low Score < 1 SOL)
        svm.airdrop(&user.pubkey(), 500_000_000).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
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
        assert_eq!(score_state.score, 60);
        assert_eq!(score_state.score_level, ScoreLevel::Low);
    }

    #[test]
    fn test_calculate_score_unverified() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create Identity but don't verify it
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Try to calculate score for unverified identity (should fail)
        let calc_ix = calculate_score_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[calc_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_score_after_unverify() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create, Verify, then Unverify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let unverify_ix = unverify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix, unverify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Try to calculate score after unverify (should fail)
        let calc_ix = calculate_score_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[calc_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    #[test]
    fn test_delete_score() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
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

        // Verify score account exists
        assert!(svm.get_account(&score_pda).is_some());

        // Delete Score
        let delete_score_ix = delete_score_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[delete_score_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify score account is deleted
        assert!(svm.get_account(&score_pda).is_none());
        // Verify identity account still exists
        assert!(svm.get_account(&identity_pda).is_some());
    }

    #[test]
    fn test_delete_identity_with_score() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
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

        // Verify both accounts exist
        assert!(svm.get_account(&identity_pda).is_some());
        assert!(svm.get_account(&score_pda).is_some());

        // Delete Identity (should also delete score)
        let delete_ix = delete_identity_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[delete_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify both accounts are deleted
        assert!(svm.get_account(&identity_pda).is_none());
        assert!(svm.get_account(&score_pda).is_none());
    }

    #[test]
    fn test_delete_identity_unauthorized() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        let hacker = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&hacker.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
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

        // Hacker tries to delete user's identity (should fail)
        let delete_ix = delete_identity_ix(&hacker.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[delete_ix],
            Some(&hacker.pubkey()),
            &[&hacker],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
        // Verify both accounts still exist
        assert!(svm.get_account(&identity_pda).is_some());
        assert!(svm.get_account(&score_pda).is_some());
    }

    #[test]
    fn test_delete_identity_without_score() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Only create identity, don't create score
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify identity exists but score doesn't
        assert!(svm.get_account(&identity_pda).is_some());
        assert!(svm.get_account(&score_pda).is_none());

        // Delete identity (should succeed even without score)
        let delete_ix = delete_identity_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[delete_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify identity is deleted
        assert!(svm.get_account(&identity_pda).is_none());
        // Score still doesn't exist
        assert!(svm.get_account(&score_pda).is_none());
    }

    #[test]
    fn test_delete_score_without_score() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());
        let (score_pda, _) = get_score_pda(&user.pubkey());

        // Create and Verify Identity, but don't create score
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify score account doesn't exist yet
        assert!(svm.get_account(&score_pda).is_none());

        // Delete Score when score doesn't exist (should succeed)
        let delete_score_ix = delete_score_ix(&user.pubkey(), &identity_pda, &score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[delete_score_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify identity still exists
        assert!(svm.get_account(&identity_pda).is_some());
        // Score still doesn't exist
        assert!(svm.get_account(&score_pda).is_none());
    }

    #[test]
    fn test_transfer_identity_basic() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

        // Create Identity for old owner
        let create_ix = create_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify identity exists
        assert!(svm.get_account(&old_identity_pda).is_some());

        // Transfer identity to new owner
        let transfer_ix = transfer_identity_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify old identity is deleted
        assert!(svm.get_account(&old_identity_pda).is_none());

        // Verify new identity exists and has correct data
        let new_account = svm.get_account(&new_identity_pda).unwrap();
        let mut data_slice = &new_account.data[..];
        let new_identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(new_identity_state.owner, new_owner.pubkey());
        assert_eq!(new_identity_state.verified, false);
        assert_eq!(new_identity_state.verified_at, None);

        // Verify score accounts (old should not exist, new should exist but empty since old didn't have one)
        assert!(svm.get_account(&old_score_pda).is_none());
        // new_score exists because init_if_needed creates it, but it's not used
        assert!(svm.get_account(&new_score_pda).is_some());
    }

    #[test]
    fn test_transfer_identity_with_score() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 15 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

        // Create and Verify Identity for old owner
        let create_ix = create_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let verify_ix = verify_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Calculate Score for old owner
        let calc_ix = calculate_score_ix(&old_owner.pubkey(), &old_identity_pda, &old_score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[calc_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Get old identity and score data for comparison
        let old_identity_account = svm.get_account(&old_identity_pda).unwrap();
        let mut old_identity_data = &old_identity_account.data[..];
        let old_identity_state = IdentityAccount::try_deserialize(&mut old_identity_data).unwrap();

        let old_score_account = svm.get_account(&old_score_pda).unwrap();
        let mut old_score_data = &old_score_account.data[..];
        let old_score_state = CreditScoreAccount::try_deserialize(&mut old_score_data).unwrap();

        // Transfer identity and score to new owner
        let transfer_ix = transfer_identity_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify old accounts are deleted
        assert!(svm.get_account(&old_identity_pda).is_none());
        assert!(svm.get_account(&old_score_pda).is_none());

        // Verify new identity exists and has correct data
        let new_identity_account = svm.get_account(&new_identity_pda).unwrap();
        let mut new_identity_data = &new_identity_account.data[..];
        let new_identity_state = IdentityAccount::try_deserialize(&mut new_identity_data).unwrap();

        assert_eq!(new_identity_state.owner, new_owner.pubkey());
        assert_eq!(new_identity_state.created_at, old_identity_state.created_at);
        assert_eq!(new_identity_state.verified, old_identity_state.verified);
        assert_eq!(
            new_identity_state.verified_at,
            old_identity_state.verified_at
        );

        // Verify new score exists and has correct data
        let new_score_account = svm.get_account(&new_score_pda).unwrap();
        let mut new_score_data = &new_score_account.data[..];
        let new_score_state = CreditScoreAccount::try_deserialize(&mut new_score_data).unwrap();

        assert_eq!(new_score_state.identity, new_identity_pda);
        assert_eq!(new_score_state.score, old_score_state.score);
        assert_eq!(new_score_state.score_level, old_score_state.score_level);
        assert_eq!(new_score_state.calculated_at, old_score_state.calculated_at);
    }

    #[test]
    fn test_transfer_identity_unauthorized() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        let hacker = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&hacker.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

        // Create Identity for old owner
        let create_ix = create_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Hacker tries to transfer old owner's identity to new owner (should fail)
        // Hacker signs as old_owner, but the program checks that identity.owner == old_owner.key()
        // Since identity.owner is the real old_owner, and hacker is signing, this will fail
        // at the program level due to the constraint check
        let transfer_ix = transfer_identity_ix(
            &hacker.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&hacker.pubkey()),
            &[&hacker],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        // Transaction should fail because the instruction expects old_owner to be the identity owner
        // but hacker is trying to sign as old_owner for someone else's identity
        assert!(result.is_err());

        // Verify old identity still exists
        assert!(svm.get_account(&old_identity_pda).is_some());
        // Verify new identity doesn't exist
        assert!(svm.get_account(&new_identity_pda).is_none());
    }

    #[test]
    fn test_transfer_identity_verify_data() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 15 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

        // Create, Verify Identity, and Calculate Score for old owner
        let create_ix = create_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let verify_ix = verify_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let calc_ix = calculate_score_ix(&old_owner.pubkey(), &old_identity_pda, &old_score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix, verify_ix, calc_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Get old identity data
        let old_identity_account = svm.get_account(&old_identity_pda).unwrap();
        let mut old_identity_data = &old_identity_account.data[..];
        let old_identity_state = IdentityAccount::try_deserialize(&mut old_identity_data).unwrap();

        // Get old score data
        let old_score_account = svm.get_account(&old_score_pda).unwrap();
        let mut old_score_data = &old_score_account.data[..];
        let old_score_state = CreditScoreAccount::try_deserialize(&mut old_score_data).unwrap();

        // Transfer identity and score
        let transfer_ix = transfer_identity_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify new identity data integrity
        let new_identity_account = svm.get_account(&new_identity_pda).unwrap();
        let mut new_identity_data = &new_identity_account.data[..];
        let new_identity_state = IdentityAccount::try_deserialize(&mut new_identity_data).unwrap();

        assert_eq!(new_identity_state.owner, new_owner.pubkey());
        assert_eq!(new_identity_state.created_at, old_identity_state.created_at);
        assert_eq!(new_identity_state.verified, old_identity_state.verified);
        assert_eq!(
            new_identity_state.verified_at,
            old_identity_state.verified_at
        );

        // Verify new score data integrity
        let new_score_account = svm.get_account(&new_score_pda).unwrap();
        let mut new_score_data = &new_score_account.data[..];
        let new_score_state = CreditScoreAccount::try_deserialize(&mut new_score_data).unwrap();

        assert_eq!(new_score_state.identity, new_identity_pda);
        assert_eq!(new_score_state.score, old_score_state.score);
        assert_eq!(new_score_state.score_level, old_score_state.score_level);
        assert_eq!(new_score_state.calculated_at, old_score_state.calculated_at);

        // Verify old owner received lamports from closed accounts
        let old_owner_balance = svm.get_balance(&old_owner.pubkey()).unwrap();
        let initial_balance = 10 * LAMPORTS_PER_SOL;
        assert!(old_owner_balance > initial_balance);
    }
}
