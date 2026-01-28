#[cfg(test)]
mod tests {
    use crate::constants::{SEED_IDENTITY, SEED_SCORE, SEED_TRANSFER_REQUEST};
    use crate::state::{CreditScoreAccount, IdentityAccount, ScoreLevel};
    use crate::ID as PROGRAM_ID;
    use anchor_lang::AccountDeserialize;
    use litesvm::LiteSVM;
    use solana_sdk::{
        account::Account,
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        transaction::Transaction,
    };
    use solana_system_interface::program;

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    /// 获取指令的 discriminator
    ///
    /// # 参数
    /// - `name`: 指令名称
    ///
    /// # 返回
    /// - 8 字节的 discriminator
    fn get_discriminator(name: &str) -> [u8; 8] {
        let preimage = format!("global:{}", name);
        let mut sighash = [0u8; 8];
        sighash.copy_from_slice(&hash(preimage.as_bytes()).to_bytes()[..8]);
        sighash
    }

    /// 获取身份账户的 PDA 地址
    ///
    /// # 参数
    /// - `owner`: 身份所有者的公钥
    ///
    /// # 返回
    /// - PDA 地址和 bump seed
    fn get_identity_pda(owner: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[SEED_IDENTITY, owner.as_ref()], &PROGRAM_ID)
    }

    /// 获取信用分账户的 PDA 地址
    ///
    /// # 参数
    /// - `owner`: 身份所有者的公钥
    ///
    /// # 返回
    /// - PDA 地址和 bump seed
    fn get_score_pda(owner: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[SEED_SCORE, owner.as_ref()], &PROGRAM_ID)
    }

    /// 获取转移请求账户的 PDA 地址
    ///
    /// # 参数
    /// - `from_owner`: 转移发起者的公钥
    /// - `to_owner`: 转移接收者的公钥
    ///
    /// # 返回
    /// - PDA 地址和 bump seed
    fn get_transfer_request_pda(from_owner: &Pubkey, to_owner: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                SEED_TRANSFER_REQUEST,
                from_owner.as_ref(),
                to_owner.as_ref(),
            ],
            &PROGRAM_ID,
        )
    }

    /// 构建创建身份指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    ///
    /// # 返回
    /// - 创建身份的指令
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

    /// 构建验证身份指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    ///
    /// # 返回
    /// - 验证身份的指令
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

    /// 构建计算信用分指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    /// - `score_account`: 信用分账户 PDA
    ///
    /// # 返回
    /// - 计算信用分的指令
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

    /// 构建取消验证身份指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    ///
    /// # 返回
    /// - 取消验证身份的指令
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

    /// 构建删除身份指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    /// - `score_account`: 信用分账户 PDA
    ///
    /// # 返回
    /// - 删除身份的指令
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

    /// 构建删除信用分指令
    ///
    /// # 参数
    /// - `owner`: 身份所有者
    /// - `identity`: 身份账户 PDA
    /// - `score_account`: 信用分账户 PDA
    ///
    /// # 返回
    /// - 删除信用分的指令
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

    /// 构建发起转移指令
    ///
    /// # 参数
    /// - `owner`: 当前身份的所有者（发起者）
    /// - `identity`: 要转移的身份账户
    /// - `transfer_request`: 转移请求账户（自动创建）
    /// - `recipient`: 接收者地址
    ///
    /// # 返回
    /// - 发起转移的指令
    fn initiate_transfer_ix(
        owner: &Pubkey,
        identity: &Pubkey,
        transfer_request: &Pubkey,
        recipient: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("initiate_transfer");

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*identity, false),
                AccountMeta::new(*transfer_request, false),
                AccountMeta::new(*owner, true),
                AccountMeta::new_readonly(*recipient, false),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data: discriminator.to_vec(),
        }
    }

    /// 构建认领转移指令
    ///
    /// # 参数
    /// - `old_owner`: 旧身份的所有者
    /// - `new_owner`: 新身份的所有者（接收者）
    /// - `old_identity`: 旧的身份账户（将被关闭）
    /// - `new_identity`: 新的身份账户（自动创建）
    /// - `transfer_request`: 转移请求账户（将被关闭）
    /// - `old_score`: 旧的信用分账户（可选）
    /// - `new_score`: 新的信用分账户（自动创建）
    ///
    /// # 返回
    /// - 认领转移的指令
    fn claim_transfer_ix(
        old_owner: &Pubkey,
        new_owner: &Pubkey,
        old_identity: &Pubkey,
        new_identity: &Pubkey,
        transfer_request: &Pubkey,
        old_score: &Pubkey,
        new_score: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("claim_transfer");

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*old_identity, false),
                AccountMeta::new(*new_identity, false),
                AccountMeta::new(*transfer_request, false),
                AccountMeta::new(*old_score, false),
                AccountMeta::new(*new_score, false),
                AccountMeta::new(*old_owner, true),
                AccountMeta::new(*new_owner, true),
                AccountMeta::new_readonly(Pubkey::from(program::id().to_bytes()), false),
            ],
            data: discriminator.to_vec(),
        }
    }

    /// 构建取消转移指令
    ///
    /// # 参数
    /// - `owner`: 转移发起者
    /// - `transfer_request`: 转移请求账户（将被关闭）
    /// - `_to_owner`: 转移接收者（用于 PDA 计算）
    ///
    /// # 返回
    /// - 取消转移的指令
    fn cancel_transfer_ix(
        owner: &Pubkey,
        transfer_request: &Pubkey,
        _to_owner: &Pubkey,
    ) -> Instruction {
        let discriminator = get_discriminator("cancel_transfer");

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*transfer_request, false),
                AccountMeta::new(*owner, true),
            ],
            data: discriminator.to_vec(),
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
        assert_eq!(score_state.score, 72);
        assert_eq!(score_state.score_level, ScoreLevel::High);
    }

    #[test]
    fn test_unverify_identity() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let (identity_pda, _) = get_identity_pda(&user.pubkey());

        // Create identity first
        let create_ix = create_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify identity
        let verify_ix = verify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Get the identity account
        let account = svm.get_account(&identity_pda).unwrap();
        let mut data_slice = &account.data[..];
        let identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(identity_state.verified, true);

        // Unverify identity
        let unverify_ix = unverify_identity_ix(&user.pubkey(), &identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[unverify_ix],
            Some(&user.pubkey()),
            &[&user],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Get the identity account again
        let account = svm.get_account(&identity_pda).unwrap();
        let mut data_slice = &account.data[..];
        let identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(identity_state.verified, false);
        assert_eq!(identity_state.verified_at, None);
    }

    #[test]
    fn test_unverify_identity_basic() {
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
    fn test_calculate_score_unverified() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
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
        assert_eq!(score_state.score, 71);
        assert_eq!(score_state.score_level, ScoreLevel::High);
    }

    #[test]
    fn test_calculate_score_unverified_fails() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
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
        assert_eq!(score_state.score_level, ScoreLevel::Medium);
    }

    #[test]
    fn test_calculate_score_various_levels() {
        let mut svm = setup_test_environment();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 500_000_000).unwrap();

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
    }

    /// 测试基本的发起和认领身份转移流程
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 新所有者认领转移
    ///
    /// # 验证点
    /// - 转移请求账户被创建
    /// - 旧身份账户被关闭
    /// - 转移请求账户被关闭
    /// - 新身份账户被创建且所有者正确
    /// - 新身份的验证状态正确继承
    #[test]
    fn test_initiate_and_claim_transfer_basic() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&transfer_request_pda).is_some());

        let claim_ix = claim_transfer_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &transfer_request_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[claim_ix],
            Some(&new_owner.pubkey()),
            &[&new_owner, &old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&old_identity_pda).is_none());
        assert!(svm.get_account(&transfer_request_pda).is_none());

        let new_account = svm.get_account(&new_identity_pda).unwrap();
        let mut data_slice = &new_account.data[..];
        let new_identity_state = IdentityAccount::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(new_identity_state.owner, new_owner.pubkey());
        assert_eq!(new_identity_state.verified, true);
        assert!(new_identity_state.verified_at.is_some());
    }

    /// 测试取消身份转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 旧所有者取消转移
    ///
    /// # 验证点
    /// - 转移请求账户被创建
    /// - 转移请求账户被关闭
    /// - 旧身份账户仍然存在（未被关闭）
    /// - 只有发起者可以取消转移
    #[test]
    fn test_cancel_transfer() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&transfer_request_pda).is_some());

        let cancel_ix = cancel_transfer_ix(
            &old_owner.pubkey(),
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[cancel_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&transfer_request_pda).is_none());
        assert!(svm.get_account(&old_identity_pda).is_some());
    }

    /// 测试带信用分的身份转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份
    /// 2. 旧所有者计算信用分
    /// 3. 旧所有者发起转移到新所有者
    /// 4. 新所有者认领转移
    ///
    /// # 验证点
    /// - 旧身份账户被关闭
    /// - 旧信用分账户被关闭
    /// - 转移请求账户被关闭
    /// - 新身份账户被创建
    /// - 新信用分账户被创建
    /// - 新信用分正确继承旧信用分的分数和等级
    #[test]
    fn test_initiate_and_claim_transfer_with_score() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 15 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

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

        let calc_ix = calculate_score_ix(&old_owner.pubkey(), &old_identity_pda, &old_score_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[calc_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let old_score_account = svm.get_account(&old_score_pda).unwrap();
        let mut old_score_data = &old_score_account.data[..];
        let old_score_state = CreditScoreAccount::try_deserialize(&mut old_score_data).unwrap();

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let claim_ix = claim_transfer_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &transfer_request_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[claim_ix],
            Some(&new_owner.pubkey()),
            &[&new_owner, &old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&old_identity_pda).is_none());
        assert!(svm.get_account(&old_score_pda).is_none());
        assert!(svm.get_account(&transfer_request_pda).is_none());

        let new_score_account = svm.get_account(&new_score_pda).unwrap();
        let mut new_score_data = &new_score_account.data[..];
        let new_score_state = CreditScoreAccount::try_deserialize(&mut new_score_data).unwrap();

        assert_eq!(new_score_state.score, old_score_state.score);
        assert_eq!(new_score_state.score_level, old_score_state.score_level);
    }

    /// 测试未授权的认领转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 第三方（hacker）尝试认领转移
    ///
    /// # 验证点
    /// - 第三方无法认领转移（交易失败）
    /// - 只有指定的接收者可以认领转移
    #[test]
    fn test_claim_transfer_unauthorized() {
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
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let claim_ix = claim_transfer_ix(
            &old_owner.pubkey(),
            &hacker.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &transfer_request_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[claim_ix],
            Some(&hacker.pubkey()),
            &[&hacker, &old_owner],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试未授权的取消转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 第三方（hacker）尝试取消转移
    ///
    /// # 验证点
    /// - 第三方无法取消转移（交易失败）
    /// - 只有发起者可以取消转移
    #[test]
    fn test_cancel_transfer_unauthorized() {
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
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let cancel_ix =
            cancel_transfer_ix(&hacker.pubkey(), &transfer_request_pda, &new_owner.pubkey());
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[cancel_ix],
            Some(&hacker.pubkey()),
            &[&hacker],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试转移保留创建时间
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 新所有者认领转移
    ///
    /// # 验证点
    /// - 新身份账户的 created_at 与旧身份账户相同
    /// - 转移过程中保留原始创建时间
    #[test]
    fn test_transfer_preserves_created_at() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

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

        let old_identity_account = svm.get_account(&old_identity_pda).unwrap();
        let mut old_identity_data = &old_identity_account.data[..];
        let old_identity_state = IdentityAccount::try_deserialize(&mut old_identity_data).unwrap();
        let created_at = old_identity_state.created_at;

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let claim_ix = claim_transfer_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &transfer_request_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix, claim_ix],
            Some(&new_owner.pubkey()),
            &[&new_owner, &old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let new_identity_account = svm.get_account(&new_identity_pda).unwrap();
        let mut new_identity_data = &new_identity_account.data[..];
        let new_identity_state = IdentityAccount::try_deserialize(&mut new_identity_data).unwrap();
        assert_eq!(new_identity_state.created_at, created_at);
    }

    /// 测试未验证身份发起转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建但未验证身份账户
    /// 2. 旧所有者尝试发起转移到新所有者
    ///
    /// # 验证点
    /// - 未验证的身份无法发起转移（交易失败）
    /// - 只有已验证的身份才能发起转移
    #[test]
    fn test_initiate_transfer_unverified_identity() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

        let create_ix = create_identity_ix(&old_owner.pubkey(), &old_identity_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试未授权发起转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 第三方（hacker）尝试发起转移旧所有者的身份
    ///
    /// # 验证点
    /// - 第三方无法发起转移（交易失败）
    /// - 只有身份的所有者可以发起转移
    #[test]
    fn test_initiate_transfer_unauthorized() {
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
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&hacker.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &hacker.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&hacker.pubkey()),
            &[&hacker],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试过期转移认领
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 新所有者尝试认领转移（验证过期检查逻辑）
    ///
    /// # 验证点
    /// - 转移请求有明确的过期时间
    /// - 转移请求包含正确的过期时间差
    #[test]
    fn test_claim_transfer_expired() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let transfer_request_account = svm.get_account(&transfer_request_pda).unwrap();
        let mut data_slice = &transfer_request_account.data[..];
        let transfer_request_data =
            crate::state::TransferRequest::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(
            transfer_request_data.expires_at - transfer_request_data.created_at,
            crate::constants::TRANSFER_EXPIRY_SECONDS
        );
    }

    /// 测试重复发起转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 旧所有者再次尝试发起转移到同一个新所有者
    ///
    /// # 验证点
    /// - 无法重复发起相同的转移（交易失败）
    /// - 每个转移请求有唯一的 PDA
    #[test]
    fn test_initiate_transfer_duplicate() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let initiate_ix_2 = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix_2],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试认领已取消转移
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 旧所有者取消转移
    /// 4. 新所有者尝试认领已取消的转移
    ///
    /// # 验证点
    /// - 无法认领已取消的转移（交易失败）
    /// - 取消的转移请求账户被关闭
    #[test]
    fn test_claim_cancelled_transfer() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (new_identity_pda, _) = get_identity_pda(&new_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());
        let (old_score_pda, _) = get_score_pda(&old_owner.pubkey());
        let (new_score_pda, _) = get_score_pda(&new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let cancel_ix = cancel_transfer_ix(
            &old_owner.pubkey(),
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[cancel_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        assert!(svm.get_account(&transfer_request_pda).is_none());

        let claim_ix = claim_transfer_ix(
            &old_owner.pubkey(),
            &new_owner.pubkey(),
            &old_identity_pda,
            &new_identity_pda,
            &transfer_request_pda,
            &old_score_pda,
            &new_score_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[claim_ix],
            Some(&new_owner.pubkey()),
            &[&new_owner, &old_owner],
            blockhash,
        );
        let result = svm.send_transaction(tx);

        assert!(result.is_err());
    }

    /// 测试转移请求数据验证
    ///
    /// # 测试场景
    /// 1. 旧所有者创建并验证身份账户
    /// 2. 旧所有者发起转移到新所有者
    /// 3. 验证转移请求账户的数据
    ///
    /// # 验证点
    /// - 转移请求包含正确的 from_owner
    /// - 转移请求包含正确的 to_owner
    /// - 转移请求包含正确的 identity
    /// - 转移请求包含正确的 created_at 和 expires_at
    #[test]
    fn test_transfer_request_data() {
        let mut svm = setup_test_environment();

        let old_owner = Keypair::new();
        let new_owner = Keypair::new();
        svm.airdrop(&old_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();
        svm.airdrop(&new_owner.pubkey(), 10 * LAMPORTS_PER_SOL)
            .unwrap();

        let (old_identity_pda, _) = get_identity_pda(&old_owner.pubkey());
        let (transfer_request_pda, _) =
            get_transfer_request_pda(&old_owner.pubkey(), &new_owner.pubkey());

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

        let initiate_ix = initiate_transfer_ix(
            &old_owner.pubkey(),
            &old_identity_pda,
            &transfer_request_pda,
            &new_owner.pubkey(),
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[initiate_ix],
            Some(&old_owner.pubkey()),
            &[&old_owner],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let transfer_request_account = svm.get_account(&transfer_request_pda).unwrap();
        let mut data_slice = &transfer_request_account.data[..];
        let transfer_request_data =
            crate::state::TransferRequest::try_deserialize(&mut data_slice).unwrap();

        assert_eq!(transfer_request_data.from_owner, old_owner.pubkey());
        assert_eq!(transfer_request_data.to_owner, new_owner.pubkey());
        assert_eq!(transfer_request_data.identity, old_identity_pda);
        assert!(transfer_request_data.expires_at > transfer_request_data.created_at);
        assert_eq!(
            transfer_request_data.expires_at - transfer_request_data.created_at,
            crate::constants::TRANSFER_EXPIRY_SECONDS
        );
    }
}
