
import { CML, Emulator, Lucid} from '@lucid-evolution/lucid';

export const signAndSubmitTx = async (tx: any, api: any) => {
    const txbytes = tx.toCBOR()
    const witnesses = await api.signTx(txbytes)
    const witnessSet = CML.TransactionWitnessSet.from_cbor_hex(witnesses)
    const witnessSetBuilder = CML.TransactionWitnessSetBuilder.new()
    witnessSetBuilder.add_existing(witnessSet)

    const txObj = CML.Transaction.from_cbor_hex(txbytes)
    witnessSetBuilder.add_existing(txObj.witness_set())

    const cborBody = tx.toTransaction().body().to_cbor_hex()
    const txBody = CML.TransactionBody.from_cbor_hex(cborBody)

    const auxiliaryData = txObj.auxiliary_data()

    const signedTx = CML.Transaction.new(
        txBody,
        witnessSetBuilder.build(),
        true,
        auxiliaryData
    );

    const signedTxBytes = signedTx.to_cbor_hex()

    const txSubmitResult = await api.submitTx(signedTxBytes)
    console.log("txSubmitResult", txSubmitResult)
}


export const setupLucid = async (walletName: string | null) => {
    if (!walletName) {
      throw new Error('No wallet selected');
    }
    const wallet = (window as any).cardano[walletName];
    const api = await wallet.enable();

    const _lucid = await Lucid(new Emulator([]), 'Mainnet');
    _lucid.selectWallet.fromAPI(api);

    const stakeAddress = await _lucid.wallet().rewardAddress()
    // getDelegations seems to not work when using an Emulator in place of a provider
    const delegation = await _lucid.wallet().getDelegation();

    return {
      _lucid,
      api,
      stakeAddress,
      delegation
    }
  }