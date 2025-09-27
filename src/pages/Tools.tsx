import React, { useState } from 'react';
import { Button } from '../components/Button';
import { useAppSelector } from '../store/hooks';
import { CML, drepIDToCredential, Emulator, fromHex, Lucid, Transaction } from '@lucid-evolution/lucid';
import ConnectWallet from '../components/ConnectWallet';
import { signAndSubmitTx } from '../functions';
import { setupLucid } from '../functions';

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
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector(state => state.wallet.address);
  const walletBalance = useAppSelector(state => state.wallet.balance)
  const [registerStake, setRegisterStake] = useState(false);
  const [showExtraItems, setShowExtraItems] = useState(false);
  const [isStaking, setIsStaking] = useState(false)
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(1);

  React.useEffect(() => {
    if ((!isWalletConnected) || (null === walletName)) {
      return
    }

    (async () => {
      const { delegation } = await setupLucid(walletName);
      console.log("inside useEffect.. delegation is ", delegation)
      setIsStaking(null !== delegation?.poolId);
    })()
  }, [isWalletConnected, walletName])

  const handleDelegateToComputerman = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid(walletName)
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
    const { _lucid, api, stakeAddress } = await setupLucid(walletName)

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
    const { _lucid, api, stakeAddress } = await setupLucid(walletName)

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
    const { _lucid, api, stakeAddress } = await setupLucid(walletName)
    const tx = await _lucid.newTx()
      .deRegisterStake(stakeAddress!)
      .attachMetadata(674, ["deregistering stake", "using the $computerman delegation tool"])
      .complete()
    await signAndSubmitTx(tx, api)
    setRegisterStake(false)
  }

  const handleJustTheTip = async () => {
    const { _lucid, api } = await setupLucid(walletName)

    const tx = await _lucid.newTx()
      .pay.ToAddress(williamDetails.paymentAddress, {
        lovelace: BigInt(tipAmount * 1_000_000)
      })
      .attachMetadata(674, ["sending tip to $computerman", "using the $computerman delegation tool"])
      .complete()

    await signAndSubmitTx(tx, api)
  }

  const handleTreasuryDonation = async () => {
    const { _lucid, api, stakeAddress } = await setupLucid(walletName)
    const tx = await _lucid.newTx()
      .attachMetadata(674, ["donating to treasury", "using the $computerman delegation tool"])
      .complete()

    const cmltx = tx.toTransaction()
    console.log(`current treasury value: ${cmltx.body().current_treasury_value()}`);
    // await signAndSubmitTx(tx, api)

  }

  return (
    <div className="min-h-screen flex flex-col">
      {
        isWalletConnected && <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
            <h1>
              $computerman's governance shortcuts
            </h1>
            <code>
              Address: {walletAddress}
            </code>
            {/* <p>Register stake: {registerStake ? "true" : "false"}</p> */}
            <div style={{border: '1px solid #ccc', padding: '1rem', borderRadius: '4px'}}>
              <p>
                Delegate to $computerman, that's me! My campain is basically to ensure Cardano
                lasts for generations to come. You can learn more about me <a href="https://github.com/willpiam/drep/tree/master" target="_blank" rel="noopener noreferrer">here</a>
              </p>
              <Button onClick={handleDelegateToComputerman}>Delegate to $computerman</Button>
            </div>
            <div style={{border: '1px solid #ccc', padding: '1rem', borderRadius: '4px'}}>
              <p>
                Delegating to the Always Abstain DRep is useful in cases where you feel it is inappropiate for you to participate in the governance process.
              </p>
              <Button onClick={handleDelegateToAlwaysAbstain}>Delegate to AlwaysAbstain</Button>
            </div>
            <div style={{border: '1px solid #ccc', padding: '1rem', borderRadius: '4px'}}>
              <p>
                Voting for a state of no confidence on Cardano signals that the community no longer trusts the current Constitutional Committee, triggering its removal and a pause on governance actions requiring its approval until a new committee is in place.
              </p>
              <Button onClick={handleDelegateToAlwaysNoConfidence}>Delegate to AlwaysNoConfidence</Button>
            </div>
            {/* a check box which when checked will add a step to the tx to register the stake */}

            {(!isStaking) && <div>
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

            {/* <div className="treasury-donation-section" style={{ border: '1px solid #ccc' }}>
              <h3>
                Treasury Donation
              </h3>
              <p>
                Use this section to make a donation to the Cardano Treasury
              </p>

              <Button onClick={handleTreasuryDonation}>
                Donate To The Treasury
              </Button>


            </div> */}


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