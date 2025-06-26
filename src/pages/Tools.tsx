import React, { useState } from 'react';
import { Button } from '../components/Button';
import { useAppSelector } from '../store/hooks';
import { CML, drepIDToCredential, Emulator, fromHex, Lucid, Transaction } from '@lucid-evolution/lucid';
import ConnectWallet from '../components/ConnectWallet';

const williamDetails = {
  drepId: "drep1yfpgzfymq6tt9c684e7vzata8r5pl4w84fmrjqeztdqw0sgpzw3nt",
  // paymentAddress: "addr1qxvkgrnhfrrkgvck67u2ygjgz0j4k0zjrup85gtza5zqf43lt26kuqf2rylhgsdhsy63dxfnh8g723ax2r7zg9y35p9qkxnven", 
  paymentAddress: "addr1qx52mlvjf93n77lsz79pn8kl80zw7pcmgqusfn747fe768g8y7a8ud59kv677q7metm2gwh9vkwnakyxwlwlkd5369xqtxleh7"
};

/*
  Todo: 
   - tool to allow donating to treasury
*/

const Tools = () => {
  const walletName  = useAppSelector((state) => state.wallet.selectedWallet);
  const [registerStake, setRegisterStake] = useState(false);
  const [showExtraItems, setShowExtraItems] = useState(false);
  const [isStaking, setIsStaking] = useState(false)
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(1);

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
    // getDelegations seems to not work when using an Emulator in place of a provider
    const delegation = await _lucid.wallet().getDelegation();

    return {
      _lucid,
      api,
      stakeAddress,
      delegation
    }
  }

  React.useEffect(( ) => {
    if ((!isWalletConnected ) || (null === walletName)) {
      return
    }

    (async () => {
      const { delegation } = await setupLucid();
      console.log("inside useEffect.. delegation is ", delegation)
      setIsStaking(null !== delegation?.poolId);
    })()
  }, [isWalletConnected, walletName])

  const handleDelegateToComputerman = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()
    const drepCredential = drepIDToCredential(williamDetails.drepId);

    const txbuilder = _lucid.newTx()

    if (registerStake) {
      txbuilder.registerStake(stakeAddress!)
    }

    if (includeTip) {
      txbuilder.pay.ToAddress(williamDetails.paymentAddress, {
        lovelace: BigInt(tipAmount * 1_000_000)
      })
    }

    txbuilder
      .delegate.VoteToDRep(stakeAddress!, drepCredential)
      .attachMetadata(674, ["delegating to $computerman", "using the $computerman delegation tool"])
        
    const tx = await txbuilder.complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  };

  const handleDelegateToAlwaysAbstain = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()

    const txbuilder = _lucid.newTx()

    if (registerStake) {
      txbuilder.registerStake(stakeAddress!)
    }

    if (includeTip) {
      txbuilder.pay.ToAddress(williamDetails.paymentAddress, {
        lovelace: BigInt(tipAmount * 1_000_000)
      })
    }

    txbuilder
      .delegate.VoteToDRep(stakeAddress!, {
        __typename: "AlwaysAbstain"
      })
      .attachMetadata(674, ["delegating to always abstain", "using the $computerman delegation tool"])

    const tx = await txbuilder.complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  }

  const handleDelegateToAlwaysNoConfidence = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid()

    const txbuilder = _lucid.newTx()

    if (registerStake) {
      txbuilder.registerStake(stakeAddress!)
    }

    if (includeTip) {
      txbuilder.pay.ToAddress(williamDetails.paymentAddress, {
        lovelace: BigInt(tipAmount * 1_000_000)
      })
    }

    txbuilder
      .delegate.VoteToDRep(stakeAddress!, {
        __typename: "AlwaysNoConfidence"
      })
      .attachMetadata(674, ["delegating to always no confidence", "using the $computerman delegation tool"])

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

  const handleJustTheTip = async () => {
    const { _lucid, api } = await setupLucid()
    
    const tx = await _lucid.newTx()
      .pay.ToAddress(williamDetails.paymentAddress, {
        lovelace: BigInt(tipAmount * 1_000_000)
      })
      .attachMetadata(674, ["sending tip to $computerman", "using the $computerman delegation tool"])
      .complete()
    
    await signAndSubmitTx(tx, api)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <h1>
        $computerman's governance shortcuts
      </h1>
      {
        isWalletConnected && <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
            {/* <p>Register stake: {registerStake ? "true" : "false"}</p> */}
            <Button onClick={handleDelegateToComputerman}>Delegate to $computerman</Button>
            <Button onClick={handleDelegateToAlwaysAbstain}>Delegate to AlwaysAbstain</Button>
            <Button onClick={handleDelegateToAlwaysNoConfidence}>Delegate to AlwaysNoConfidence</Button>
            {/* a check box which when checked will add a step to the tx to register the stake */}
            
            { (!isStaking) && <div>
              <input type="checkbox" id="registerStake" checked={registerStake} onChange={() => setRegisterStake(!registerStake)} />
              <label htmlFor="registerStake">Register stake (select if you have not registered your account)</label>
            </div>
            }

            <div className='include-tip-option'>
              <input type="checkbox" id="includeTip" checked={includeTip} onChange={() => setIncludeTip(!includeTip)} />
              <label htmlFor="includeTip">Include tip to $computerman</label>

              {
                includeTip && <div className='include-tip-section'>
                  <div>
                    <label htmlFor="tipAmount">Tip amount (ADA):</label>
                    <input 
                      type="number" 
                      id="tipAmount" 
                      value={tipAmount} 
                      onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.000001"
                      max="999999"
                    />
                  </div>
                  <Button onClick={handleJustTheTip}>Just the tip</Button>
                </div>
  
              }
            </div>

            <div>
              <input type="checkbox" id="showExtraItems" checked={showExtraItems} onChange={() => setShowExtraItems(!showExtraItems)} />
              <label htmlFor="showExtraItems">Show extra options</label>
            </div>

            {showExtraItems && (
              <div className="extra-items" style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                <h3> Extra Options</h3>
                <p>You likely don't need to use these options</p>
                <Button onClick={handleDeregisterStake}>Deregister stake</Button>
              </div>
            )}
          </div>
        </div>
      }
      {
        !isWalletConnected && <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div>
              Connect With A Cardano Wallet To Continue
            </div>
            <ConnectWallet />
          </div>
      }

    </div>
  );
};

export default Tools; 