import * as anchor from "@project-serum/anchor"
import * as spl from "@solana/spl-token"
import { Program } from "@project-serum/anchor"
import { SignerAuthorization } from "../target/types/signer_authorization"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"
import { expect } from "chai"

describe("signer-authorization", () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace
    .SignerAuthorization as Program<SignerAuthorization>
  const connection = anchor.getProvider().connection
  const wallet = anchor.workspace.SignerAuthorization.provider.wallet
  const walletFake = anchor.web3.Keypair.generate()
  const tokenAccount = anchor.web3.Keypair.generate()

  const [vaultPDA] = findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  )

  let mint: anchor.web3.PublicKey
  let withdrawDestinationFake: anchor.web3.PublicKey

  before(async () => {
    mint = await spl.createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      0
    )

    withdrawDestinationFake = await spl.createAccount(
      connection,
      wallet.payer,
      mint,
      walletFake.publicKey
    )

    await connection.confirmTransaction(
      await connection.requestAirdrop(
        walletFake.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    )
  })

  it("Initialize Vault", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPDA,
        tokenAccount: tokenAccount.publicKey,
        mint: mint,
        authority: wallet.publicKey,
      })
      .signers([tokenAccount])
      .rpc()

    await spl.mintTo(
      connection,
      wallet.payer,
      mint,
      tokenAccount.publicKey,
      wallet.payer,
      100
    )

    const balance = await connection.getTokenAccountBalance(
      tokenAccount.publicKey
    )
    expect(balance.value.uiAmount).to.eq(100)
  })
})
