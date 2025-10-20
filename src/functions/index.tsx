
import { CML, Emulator, Lucid} from '@lucid-evolution/lucid';

export const signAndSubmitTx = async (tx: any, api: any) => {
  console.log(`STUB about to sign and submit tx`)
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
    console.log(`STUB have signedTxBytes ${signedTxBytes}`)

    const txSubmitResult = await api.submitTx(signedTxBytes)
    console.log("txSubmitResult", txSubmitResult)
}


export const setupLucid = async (walletName: string | null, useBlockfrost: boolean = false, apiKey: string | null = null) => {
    if (!walletName) {
      throw new Error('No wallet selected');
    }
    const wallet = (window as any).cardano[walletName];
    const api = await wallet.enable();

    let _lucid;
    if (useBlockfrost && apiKey) {
      // Use Blockfrost provider
      const { Blockfrost } = await import('@lucid-evolution/provider');
      const blockfrostProvider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', apiKey);
      _lucid = await Lucid(blockfrostProvider, 'Mainnet');
      console.log('Using Blockfrost provider in setupLucid');
    } else {
      // Use Emulator provider
      _lucid = await Lucid(new Emulator([]), 'Mainnet');
      console.log('Using Emulator provider in setupLucid');
    }
    
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