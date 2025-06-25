import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/Button';
import { useAppSelector } from '../store/hooks';
import { CML, drepIDToCredential, Emulator, fromHex, Lucid, Transaction } from '@lucid-evolution/lucid';

const Tools = () => {
  const walletAddress = useAppSelector(state => state.wallet.address);
  const walletName  = useAppSelector((state) => state.wallet.selectedWallet);
  const [registerStake, setRegisterStake] = useState(false);
 
  const signAndSubmitTx = async (tx: any, api: any) => {
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

  const setupLucid = async () => {
    if (!walletName) {
        throw new Error('No wallet selected');
    }
    const wallet = (window as any).cardano[walletName];
    const api = await wallet.enable();

    const _lucid = await Lucid(new Emulator([]), 'Mainnet');
    _lucid.selectWallet.fromAPI(api);

    const stakeAddress = await _lucid.wallet().rewardAddress()
    return {
      _lucid,
      api,
      stakeAddress,
    }
  }

  const handleDelegateToComputerman = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()
    const drepCredential = drepIDToCredential("drep1yfpgzfymq6tt9c684e7vzata8r5pl4w84fmrjqeztdqw0sgpzw3nt");

    const txbuilder =  _lucid.newTx()
        .delegate.VoteToDRep(stakeAddress!, drepCredential)
        .attachMetadata(674, ["delegating to $computerman", "using the $computerman delegation tool"])

    if (registerStake) {
      txbuilder.registerStake(stakeAddress!)
    }
        
    const tx = await txbuilder.complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  };

  const handleDelegateToAlwaysAbstain = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()

    const txbuilder = _lucid.newTx()
        .delegate.VoteToDRep(stakeAddress!, {
          __typename: "AlwaysAbstain"
        })
        .attachMetadata(674, ["delegating to always abstain", "using the $computerman delegation tool"])

    if (registerStake) {
      txbuilder.registerStake(stakeAddress!)
    }

    const tx = await txbuilder.complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  }

  const handleDelegateToAlwaysNoConfidence = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()

    // const txbuilder = _lucid.newTx()
    //     .delegate.VoteToDRep(stakeAddress!, {
    //       __typename: "AlwaysNoConfidence"
    //     })
    //     .attachMetadata(674, ["delegating to always no confidence", "using the $computerman delegation tool"])

    // if (registerStake) {
    //   txbuilder.registerStake(stakeAddress!)
    // }

    const txbuilder = (() => {
      if (registerStake) {
        return  _lucid.newTx()
          .registerStake(stakeAddress!)
          .delegate.VoteToDRep(stakeAddress!, {
            __typename: "AlwaysNoConfidence"
          })
          .attachMetadata(674, ["delegating to always no confidence", "using the $computerman delegation tool"])
      }
      return _lucid.newTx()
        .delegate.VoteToDRep(stakeAddress!, {
          __typename: "AlwaysNoConfidence"
        })
        .attachMetadata(674, ["delegating to always no confidence", "using the $computerman delegation tool"])
    })()

    const tx = await txbuilder.complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  }

  // handle deregister stake
  const handleDeregisterStake = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()
    const tx = await _lucid.newTx()
      .deRegisterStake(stakeAddress!)
      .attachMetadata(674, ["deregistering stake", "using the $computerman delegation tool"])
      .complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <p>Register stake: {registerStake ? "true" : "false"}</p>
        <Button onClick={handleDeregisterStake}>Deregister stake</Button>
        <Button onClick={handleDelegateToComputerman}>Delegate to $computerman</Button>
        <Button onClick={handleDelegateToAlwaysAbstain}>Delegate to always abstain</Button>
        <Button onClick={handleDelegateToAlwaysNoConfidence}>Delegate to always no AlwaysNoConfidence</Button>
        {/* a check box which when checked will add a step to the tx to register the stake */}
        <input type="checkbox" id="registerStake" checked={registerStake} onChange={() => setRegisterStake(!registerStake)} />
        <label htmlFor="registerStake">Register stake</label>
      </main>

      <Footer />
    </div>
  );
};

export default Tools; 