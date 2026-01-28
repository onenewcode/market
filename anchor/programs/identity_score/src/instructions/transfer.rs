use crate::constants::*;
use crate::errors::IdentityScoreError;
use crate::events;
use crate::state::*;
use anchor_lang::prelude::*;

/// 发起身份转移
///
/// # 功能说明
/// 身份所有者发起将身份转移到另一个钱包的请求
/// 只需要传入接收者的地址，系统会自动创建转移请求
/// 接收者需要在过期前认领转移
pub fn initiate_transfer(ctx: Context<InitiateTransfer>) -> Result<()> {
    let transfer_request = &mut ctx.accounts.transfer_request;
    let timestamp = Clock::get()?.unix_timestamp;

    transfer_request.from_owner = ctx.accounts.owner.key();
    transfer_request.to_owner = ctx.accounts.recipient.key();
    transfer_request.identity = ctx.accounts.identity.key();
    transfer_request.created_at = timestamp;
    transfer_request.expires_at = timestamp + TRANSFER_EXPIRY_SECONDS;

    emit!(events::TransferInitiated {
        from_owner: ctx.accounts.owner.key(),
        to_owner: ctx.accounts.recipient.key(),
        identity: ctx.accounts.identity.key(),
        transfer_request: transfer_request.key(),
        expires_at: transfer_request.expires_at,
        timestamp,
    });

    Ok(())
}

/// 认领身份转移
///
/// # 功能说明
/// 接收者认领发起的身份转移请求
/// 系统会自动：
/// - 创建新的身份账户给接收者
/// - 转移信用分（如果存在）
/// - 关闭旧的转移请求
/// - 关闭旧的身份账户
///
/// # 注意事项
/// - 必须在转移请求过期前认领
/// - 只有接收者可以认领
/// - 信用分会自动转移（如果存在）
pub fn claim_transfer(ctx: Context<ClaimTransfer>) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let transfer_request = &ctx.accounts.transfer_request;

    require!(
        timestamp <= transfer_request.expires_at,
        IdentityScoreError::TransferExpired
    );

    require!(
        ctx.accounts.new_owner.key() == transfer_request.to_owner,
        IdentityScoreError::Unauthorized
    );

    ctx.accounts.new_identity.owner = ctx.accounts.new_owner.key();
    ctx.accounts.new_identity.created_at = ctx.accounts.old_identity.created_at;
    ctx.accounts.new_identity.verified = ctx.accounts.old_identity.verified;
    ctx.accounts.new_identity.verified_at = ctx.accounts.old_identity.verified_at;

    let (old_score_key, new_score_key) = if ctx.accounts.old_score.data_len() > 0 {
        let score_state = verify_and_extract_old_score(&ctx)?;

        let score_lamports = ctx.accounts.old_score.lamports();
        **ctx.accounts.old_score.lamports.borrow_mut() = 0;
        **ctx
            .accounts
            .new_owner
            .to_account_info()
            .lamports
            .borrow_mut() += score_lamports;

        ctx.accounts.new_score.identity = ctx.accounts.new_identity.key();
        ctx.accounts.new_score.score = score_state.score;
        ctx.accounts.new_score.score_level = score_state.score_level;
        ctx.accounts.new_score.calculated_at = score_state.calculated_at;

        (
            Some(ctx.accounts.old_score.key()),
            Some(ctx.accounts.new_score.key()),
        )
    } else {
        (None, None)
    };

    emit!(events::TransferClaimed {
        from_owner: ctx.accounts.old_owner.key(),
        to_owner: ctx.accounts.new_owner.key(),
        old_identity: ctx.accounts.old_identity.key(),
        new_identity: ctx.accounts.new_identity.key(),
        old_score: old_score_key,
        new_score: new_score_key,
        timestamp,
    });

    Ok(())
}

/// 取消身份转移
///
/// # 功能说明
/// 转移发起者可以取消未认领的转移请求
/// 转移请求账户会被关闭，lamports 返回给发起者
pub fn cancel_transfer(ctx: Context<CancelTransfer>) -> Result<()> {
    emit!(events::TransferCancelled {
        from_owner: ctx.accounts.owner.key(),
        to_owner: ctx.accounts.transfer_request.to_owner,
        identity: ctx.accounts.transfer_request.identity,
        transfer_request: ctx.accounts.transfer_request.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// 验证并提取旧的信用分数据
///
/// # 功能说明
/// 验证旧的信用分账户是否合法，并提取其数据
///
/// # 验证项
/// - 账户地址是否为正确的 PDA
/// - 账户所有者是否为当前程序
/// - 信用分是否关联到正确的身份账户
fn verify_and_extract_old_score(ctx: &Context<ClaimTransfer>) -> Result<CreditScoreAccount> {
    let (expected_score_pda, _) = Pubkey::find_program_address(
        &[SEED_SCORE, ctx.accounts.old_owner.key().as_ref()],
        ctx.program_id,
    );

    require_keys_eq!(
        ctx.accounts.old_score.key(),
        expected_score_pda,
        IdentityScoreError::Unauthorized
    );

    require!(
        ctx.accounts.old_score.owner == ctx.program_id,
        IdentityScoreError::Unauthorized
    );

    let mut data_slice = &ctx.accounts.old_score.data.borrow()[..];
    let score_state = CreditScoreAccount::try_deserialize(&mut data_slice)?;

    require!(
        score_state.identity == ctx.accounts.old_identity.key(),
        IdentityScoreError::Unauthorized
    );

    Ok(score_state)
}

/// 发起身份转移的账户结构
///
/// # 所需账户
///
/// 1. **identity** - 要转移的身份账户
///    - 必须是已验证的身份
///    - 所有权必须属于发起者
///    - PDA: [SEED_IDENTITY, owner.key().as_ref()]
///
/// 2. **transfer_request** - 转移请求账户（自动创建）
///    - 新创建的账户
///    - PDA: [SEED_TRANSFER_REQUEST, owner.key().as_ref(), recipient.key().as_ref()]
///    - 包含转移的元数据和过期时间
///
/// 3. **owner** - 当前身份的所有者（发起者）
///    - 必须签名
///    - 支付创建 transfer_request 的费用
///
/// 4. **recipient** - 接收者地址
///    - 只需要传入地址，不需要签名
///    - 用于创建转移请求的 PDA
///
/// 5. **system_program** - 系统程序
///    - 用于创建新账户
#[derive(Accounts)]
pub struct InitiateTransfer<'info> {
    /// 要转移的身份账户
    #[account(
        mut,
        seeds = [SEED_IDENTITY, owner.key().as_ref()],
        bump,
        constraint = identity.owner == owner.key() @ IdentityScoreError::Unauthorized,
        constraint = identity.verified == true @ IdentityScoreError::IdentityNotVerified
    )]
    pub identity: Account<'info, IdentityAccount>,

    /// 转移请求账户（自动创建）
    #[account(
        init,
        payer = owner,
        space = TransferRequest::SPACE,
        seeds = [SEED_TRANSFER_REQUEST, owner.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub transfer_request: Account<'info, TransferRequest>,

    /// 当前身份的所有者（发起者）
    #[account(mut)]
    pub owner: Signer<'info>,

    /// 接收者地址（只需传入地址，无需签名）
    /// CHECK: 接收者地址仅用于创建转移请求的 PDA，不需要任何安全检查
    pub recipient: UncheckedAccount<'info>,

    /// 系统程序
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ClaimTransfer<'info> {
    /// 旧的身份账户（将被关闭）
    #[account(
        mut,
        seeds = [SEED_IDENTITY, old_owner.key().as_ref()],
        bump,
        close = old_owner,
        constraint = old_identity.owner == old_owner.key() @ IdentityScoreError::Unauthorized
    )]
    pub old_identity: Account<'info, IdentityAccount>,

    /// 新的身份账户（自动创建）
    #[account(
        init,
        payer = new_owner,
        space = 8 + 32 + 8 + 1 + 9,
        seeds = [SEED_IDENTITY, new_owner.key().as_ref()],
        bump
    )]
    pub new_identity: Account<'info, IdentityAccount>,

    /// 转移请求账户（将被关闭）
    #[account(
        mut,
        close = new_owner,
        seeds = [SEED_TRANSFER_REQUEST, transfer_request.from_owner.as_ref(), transfer_request.to_owner.as_ref()],
        bump
    )]
    pub transfer_request: Account<'info, TransferRequest>,

    /// 旧的信用分账户（可选，可以是未初始化的）
    /// CHECK: 允许未初始化的账户，地址通过 PDA 验证，仅在 data_len() > 0 时才反序列化处理
    #[account(mut)]
    pub old_score: AccountInfo<'info>,

    /// 新的信用分账户（自动创建）
    #[account(
        init_if_needed,
        payer = new_owner,
        space = 8 + 32 + 1 + 1 + 8,
        seeds = [SEED_SCORE, new_owner.key().as_ref()],
        bump
    )]
    pub new_score: Account<'info, CreditScoreAccount>,

    /// 旧身份的所有者（不需要签名，已通过 initiate_transfer 授权）
    /// CHECK: 仅用于验证身份所有权和关闭账户
    #[account(mut)]
    pub old_owner: AccountInfo<'info>,

    /// 新身份的所有者（接收者）
    #[account(mut)]
    pub new_owner: Signer<'info>,

    /// 系统程序
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    /// 转移请求账户（将被关闭）
    #[account(
        mut,
        close = owner,
        seeds = [SEED_TRANSFER_REQUEST, owner.key().as_ref(), transfer_request.to_owner.as_ref()],
        bump,
        constraint = transfer_request.from_owner == owner.key() @ IdentityScoreError::Unauthorized
    )]
    pub transfer_request: Account<'info, TransferRequest>,

    /// 转移发起者
    #[account(mut)]
    pub owner: Signer<'info>,
}
