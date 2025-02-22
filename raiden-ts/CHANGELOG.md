# Changelog

## [Unreleased]

## [2.1.0] - 2021-12-29

## [2.0.1] - 2021-12-24

## [2.0.0] - 2021-12-23
### Changed
- [#2949] Allows `Raiden.transfer`'s `options.paths` to receive a broader schema, including `{ route: Address[]; estimated_fee: Int<32>; address_metadata?: ... }[]`, needed to support CLI's `paths` parameter of `/payments` endpoint
- [#2953] `config.gasPriceFactor` applies over `maxPriorityFeePerGas`, using the new fee parameters from London when possible; now, by default, no fee parameters are specified, leaving `ethers` and provider (e.g. Metamask) to figure out best gas fees, fixing [#2952];
- [#2965] Add +5% `gasLimit` margin on transactions which are successfuly estimated, to avoid running out of gas on narrow calls.
- [#3012] Updated raiden-contracts to [v0.40](https://github.com/raiden-network/raiden-contracts/releases/tag/v0.40.0)

### Removed
- [#2965] Remove `options.subkey` on certain `Raiden` public methods; if you need to force subkey or main account usage for single txs, set `config.subkey` then reset after tx is sent; default behavior is kept

### Fixed
- [#2913] Fix crash when starting client with `userDepositContractAddress` as contracts entrypoint on a `TokenNetworkRegistry` with no registered tokens yet
- [#2963] Don't set channel as `closing` upon `channelClose.request`, allowing user to cancel Metamask's prompt and keep an usable channel; Channel becomes `closing` only after tx is sent

[#2913]: https://github.com/raiden-network/light-client/issues/2913
[#2949]: https://github.com/raiden-network/light-client/issues/2949
[#2952]: https://github.com/raiden-network/light-client/issues/2952
[#2953]: https://github.com/raiden-network/light-client/pull/2953
[#2963]: https://github.com/raiden-network/light-client/issues/2963
[#2965]: https://github.com/raiden-network/light-client/pull/2965
[#3012]: https://github.com/raiden-network/light-client/pull/3012

## [2.0.0-rc.2] - 2021-09-14

### Fixed
- [#2798] Delay non-closing auto-settle to prevent wasted gas on channelSettle race; closing side is given priority on auto-settling
- [#2889] Ensure capabilities are updated when they change even if RTC channels are established by reconnecting them.

### Added
- [#2891] Use `TokenNetwork.openChannelWithDeposit` on new contracts for faster open+deposit in a single transaction.
- [#2892] Use `UserDeposit.withdrawToBeneficiary` to withdraw from UDC directly to main account

[#2798]: https://github.com/raiden-network/light-client/issues/2798
[#2889]: https://github.com/raiden-network/light-client/issues/2889
[#2891]: https://github.com/raiden-network/light-client/issues/2891
[#2892]: https://github.com/raiden-network/light-client/issues/2892

## [2.0.0-rc.1] - 2021-08-13
### Added
- [#2839] Cooperative settle - allow users to exchange withdraw signatures enabling settling a channel instantly. This is the new default behavior on `Raiden.closeChannel`, falling back to default uncooperative close if needed.

[#2839]: https://github.com/raiden-network/light-client/issues/2839

## [1.1.0] - 2021-08-09
### Added
- [#2766] Add `Capabilities.IMMUTABLE_METADATA` (true on LC, fallback to falsy for backwards compatibility) to allow opting in of not prunning metadata.route and allowing to pass it through mediators unchanged
- [#2730] Add `config.encryptSecret` and `Raiden.transfer`'s `encryptSecret` boolean option, to allow sending secret to target on LockedTransfer's metadata, encrypted with ECIES over their publicKey, skipping SecretRequest/Reveal and speeding up transfers.

### Fixed
- [#2831] Force PFS to acknowledge our capabilities updates
- [#2868] Invalidate routes where some mediator have `capabilities.Mediate=0` and error if this is the only route received from PFS.

[#2730]: https://github.com/raiden-network/light-client/issues/2730
[#2766]: https://github.com/raiden-network/light-client/pull/2766
[#2831]: https://github.com/raiden-network/light-client/issues/2831
[#2868]: https://github.com/raiden-network/light-client/pull/2868

## [1.0.0] - 2021-06-16
### Removed
- [#2571] **BREAKING** Remove ability to join and send messages to global service rooms
- [#2822] **BREAKING** Do not join global rooms anymore, so Matrix-based presence won't work

### Changed
- [#2572] **BREAKING** Send services messages through `toDevice` instead of global rooms
- [#2822] **BREAKING** Presence now gets fetched from PFS and requires a Bespin-compatible (Raiden 2.0) service and transport network
- [#2824] Default Monitoring Service reward increased to 80 SVT

### Added
- [#2822] Added ability to use peer's presence from `LockedTransfer`'s `metadata.routes.address_metadata`

[#2571]: https://github.com/raiden-network/light-client/issues/2571
[#2572]: https://github.com/raiden-network/light-client/issues/2572
[#2822]: https://github.com/raiden-network/light-client/pull/2822
[#2824]: https://github.com/raiden-network/light-client/pull/2824

## [0.17.0] - 2021-06-15
### Added
- [#1576] Add functionality to deploy token networks
- [#2577] Add imbalance penalty mediation fees
- [#2795] Add `config.gasPriceFactor` option, to increase the transactions `gasPrice` as a multiplier of provider-returned `eth_gasPrice`
- [#2813] `open`/`depositChannel` have a new option (`confirmConfirmation`, `true` by default) to wait `+confirmationBlocks` (default=5) after last transaction to give more time for it to be synced on partners and services

### Changed
- [#2669] Update to Raiden contracts `v0.37.5`
- [#2677] Removed the dependency on reactive notifications of peer's presences changes and updated WebRTC signaling algorithm

### Fixed
- [#2797] Fixed a non-critical bug where withdraw expiration messages would not stop being retried

[#1576]: https://github.com/raiden-network/light-client/issues/1576
[#2577]: https://github.com/raiden-network/light-client/issues/2577
[#2669]: https://github.com/raiden-network/light-client/issues/2669
[#2677]: https://github.com/raiden-network/light-client/issues/2677
[#2795]: https://github.com/raiden-network/light-client/issues/2795
[#2797]: https://github.com/raiden-network/light-client/issues/2797
[#2813]: https://github.com/raiden-network/light-client/issues/2813

## [0.16.0] - 2021-04-01
### Added
- [#1342] Flat (fixed) mediation fees for mediator nodes
- [#1343] Proportional (per transfer amount) mediation fees for mediator nodes
- [#2581] `config.pfsSafetyMargin` now also accepts a `[f, a]` pair, which will add `f*fee + a*amount` on top of PFS's estimated fee, if one wants finer-grain control on safety margin which is added on the transfer to be initiated.
- [#2629] `config.autoUDCWithdraw` (default=true) to allow disabling automatically completing a planned UDC withdraw, and new `Raiden.getUDCWithdrawPlan` and `Raiden.withdrawFromUDC` to check and perform UDC withdraw when not in auto mode.
- [#2644] `Raiden.getUDCTotalDeposit` method to fetch UDC total_deposit, base of `depositToUDC` amounts

### Changed
- [#2536] Wait for global messages before resolving deposits and channel open request
- [#2566] Optimize initial sync and resume previous sync filters scans
- [#2570] Support multiple custom services in config.pfs
- [#2635] **BREAKING** Renamed `Raiden.planUdcWithdraw` to `Raiden.planUDCWithdraw` for consistency
- [#2645] Wait for condition to be ready on `settleChannel` and `withdrawFromUDC` in case it's called early instead of erroring

### Removed
- [#2550] **BREAKING** Remove migration of legacy state at localStorage during creation
- [#2567] **BREAKING** Remove support for peer-to-peer communication through Matrix rooms; now supports only `toDevice` and WebRTC channels.
- [#2600] `wrtc` auto-polyfill; now, if you're using `raiden-ts` in a NodeJS project, you're expected to polyfill `wrtc` or some WebRTC-compatible API to your global object; in exchange, the SDK doesn't require WebRTC, and therefore should work fine on environments without it (through matrix' toDevice messages).

### Fixed
- [#2596] Fix unlocking sent transfers even if receiving is disabled

[#1342]: https://github.com/raiden-network/light-client/issues/1342
[#1343]: https://github.com/raiden-network/light-client/issues/1343
[#2536]: https://github.com/raiden-network/light-client/issues/2536
[#2550]: https://github.com/raiden-network/light-client/issues/2550
[#2566]: https://github.com/raiden-network/light-client/issues/2566
[#2567]: https://github.com/raiden-network/light-client/issues/2567
[#2570]: https://github.com/raiden-network/light-client/issues/2570
[#2581]: https://github.com/raiden-network/light-client/pull/2581
[#2596]: https://github.com/raiden-network/light-client/issues/2596
[#2600]: https://github.com/raiden-network/light-client/issues/2600
[#2629]: https://github.com/raiden-network/light-client/issues/2629
[#2635]: https://github.com/raiden-network/light-client/pull/2635
[#2644]: https://github.com/raiden-network/light-client/pull/2644
[#2645]: https://github.com/raiden-network/light-client/issues/2645

## [0.15.0] - 2021-01-26
### Added
- [#211] 'suggestPartners' method to fetch suggested partners from PFS
- [#485] Enable the Redux DevTools Extension in development for monitoring the Redux store
- [#2417] Make 'start' async, introduce 'synced' promise, both resolves when syncing finishes
- [#2444] Add adaptative sync for chunked getLogs
- [#2446] Add parameter for subkey generation to overwrite origin URL

### Changed
- [#2409] Lower default payment expiration to 1.1 × reveal timeout
- [#2505] Properly shut down epics on stop and wait for teardown/cleanup tasks

### Fixed
- [#2352] Presence bug, transport fixes and performance improvements

[#211]: https://github.com/raiden-network/light-client/issues/211
[#485]: https://github.com/raiden-network/light-client/issues/485
[#2352]: https://github.com/raiden-network/light-client/issues/2352
[#2409]: https://github.com/raiden-network/light-client/issues/2409
[#2417]: https://github.com/raiden-network/light-client/pull/2417
[#2444]: https://github.com/raiden-network/light-client/issues/2444
[#2446]: https://github.com/raiden-network/light-client/issues/2446
[#2505]: https://github.com/raiden-network/light-client/pull/2505

## [0.14.0] - 2020-11-25
### Fixed
- [#2360] Properly error & shutdown if database gets deleted at runtime

### Added
- [#1256] Disable receiving if blocks don't arrive in a timely manner
- [#2395] Calculate and expose Raiden.blockTime$ as observable of average block times

[#1256]: https://github.com/raiden-network/light-client/issues/1256
[#2360]: https://github.com/raiden-network/light-client/issues/2360
[#2395]: https://github.com/raiden-network/light-client/pull/2395

## [0.13.0] - 2020-11-10
### Fixed
- [#2058] Check some potential overflows when handling received messages
- [#2240] Handle network problems when connecting to the Eth node gracefully
- [#2299] Don't acknowledge SecretReveals if receiving is disabled
- [#2312] Call WebRTC's connection.close() on teardown

### Changed
- [#1707] Upgrade ethers to v5
- [#2289] Switch to yarn from pnpm
- [#2297] Add logs when ignoring incoming transfers
- [#2311] Bump NodeJS requirement to v14 LTS
- [#2312] Make Raiden.stop() async, resolves when DB finished flushing

[#1707]: https://github.com/raiden-network/light-client/issues/1707
[#2058]: https://github.com/raiden-network/light-client/issues/2058
[#2240]: https://github.com/raiden-network/light-client/issues/2240
[#2289]: https://github.com/raiden-network/light-client/pull/2289
[#2297]: https://github.com/raiden-network/light-client/issues/2297
[#2299]: https://github.com/raiden-network/light-client/issues/2299
[#2311]: https://github.com/raiden-network/light-client/issues/2311
[#2312]: https://github.com/raiden-network/light-client/pull/2312

## [0.12.0] - 2020-10-22
### Fixed
- [#2078] Check for overflows before sending transfers
- [#2094] Fix TransferState's timestamps missing
- [#2174] Fix a few transport issues triggered on high-load scenarios
- [#2229] Fix nonce mismatch caused by room waiting overhead
- [#2275] Fix mismatch between UDC totalDeposit and effectiveBalance

### Added
- [#2044] Introduce PouchDB (IndexedDB/leveldown) as new persistent state storage backend
- [#2204] Implement toDevice capability and messaging

### Changed
- [#2158] Adapt WebRTC to new protocol compatible with python client
- [#2205] Adapt capabilities to the new query string format

[#2044]: https://github.com/raiden-network/light-client/issues/2044
[#2078]: https://github.com/raiden-network/light-client/issues/2078
[#2094]: https://github.com/raiden-network/light-client/issues/2094
[#2158]: https://github.com/raiden-network/light-client/issues/2158
[#2174]: https://github.com/raiden-network/light-client/pull/2174
[#2204]: https://github.com/raiden-network/light-client/issues/2204
[#2205]: https://github.com/raiden-network/light-client/issues/2205
[#2229]: https://github.com/raiden-network/light-client/issues/2229
[#2275]: https://github.com/raiden-network/light-client/issues/2225

## [0.11.1] - 2020-08-18
### Changed
- [#2049] Target ES2019 (NodeJS 12+) on SDK builds
- [#2054] Update to Raiden contracts `v0.37.1`

[#2049]: https://github.com/raiden-network/light-client/issues/2049
[#2054]: https://github.com/raiden-network/light-client/pull/2054

## [0.11.0] - 2020-08-04
### Fixed
- [#1923] Fix `fromEthersEvent` ranges fetching in case of temporary connectivity loss
- [#1952] Fix nonce conflict issues with concurrent transactions
- [#1997] Fix matrix rate-limiting logins when many nodes are started in parallel
- [#1998] Fix events reverted due to a reorg still getting confirmed
- [#2010] Fix multiple approve on secure ERC20 tokens, like RDN

### Added
- [#237] Add autoSettle config (off by default) to allow auto-settling settleable channels
- [#703] Add option to fetch all contracts addresses from UserDeposit address alone
- [#1710] Add option to specify a transfer's lock timeout
- [#1910] Add option to `mint` tokens for any address
- [#1913] Added `contractsInfo` getter holding current contracts info
- [#1824] Expose channel settle actions as events
- [#2022] Add 'pfsMaxFee', 'pfsMaxPaths' and 'pfsIouTimeout' config options

### Changed
- [#1905] Fail early if not enough tokens to deposit
- [#1958] Transfers can fail before requesting PFS if there's no viable channel
- [#2010] Token.approve defaults to MaxUint256, so only one approval is needed per token; set config.minimumAllowance to Zero to fallback to strict deposit values
- [#2019] Use exponential back-off strategy for protocol messages retries

[#237]: https://github.com/raiden-network/light-client/issues/237
[#703]: https://github.com/raiden-network/light-client/issues/703
[#1710]: https://github.com/raiden-network/light-client/issues/1710
[#1824]: https://github.com/raiden-network/light-client/issues/1824
[#1905]: https://github.com/raiden-network/light-client/issues/1905
[#1910]: https://github.com/raiden-network/light-client/pull/1910
[#1913]: https://github.com/raiden-network/light-client/pull/1913
[#1923]: https://github.com/raiden-network/light-client/issues/1923
[#1952]: https://github.com/raiden-network/light-client/issues/1952
[#1958]: https://github.com/raiden-network/light-client/issues/1958
[#1997]: https://github.com/raiden-network/light-client/issues/1997
[#1998]: https://github.com/raiden-network/light-client/issues/1998
[#2010]: https://github.com/raiden-network/light-client/issues/2010
[#2019]: https://github.com/raiden-network/light-client/issues/2019
[#2022]: https://github.com/raiden-network/light-client/pull/2022
[#2049]: https://github.com/raiden-network/light-client/issues/2049

## [0.10.0] - 2020-07-13
### Fixed
- [#1514] Fix handling of expired LockedTransfer and WithdrawRequest
- [#1607] Fix settling when one side closes/updates with outdated BalanceProof
- [#1637] Fix depositToUDC failing if services already have withdrawn some fees
- [#1651] Fix PFS being disabled if passed an undefined default config
- [#1690] Fix LockExpired with empty balanceHash verification
- [#1698] Fix estimateGas errors on channelOpen not properly being handled
- [#1761] Fix deposit error on openChannel not rejecting promise
- [#1787] Fix TokenNetwork monitoring losing events
- [#1830] Fix a nonce race when openining + depositing concurrently
- [#1848] Fix a Metamask error by retry on deposit
- [#1882] Fix paymentId gets ignored when being falsie (e.g. `0`)

### Added
- [#249] Add withdraw functionality
- [#1374] Monitors MonitoringService contract and emit event when MS acts
- [#1421] Adds support for withdrawing tokens from the UDC
- [#1642] Check token's allowance before deposit and skip approve
- [#1701] Allow parameter decoding to throw and log customized errors
- [#1701] Add and extend error codes for user parameter validation for open channel
- [#1711] Add and extend error codes for user parameter validation for transfer
- [#1835] The presence knowledge for a payment routes target is secured automatically

### Changed
- [#837] Changes the action tags from camel to path format. This change affects the event types exposed through the public API.
- [#1610] Updates smart contracts to v0.37.0 (Alderaan)
- [#1649] Have constant error messages and codes in public Raiden API.
- [#1657] Expose RaidenChannel's id,settleTimeout,openBlock as required properties
- [#1708] Expose RaidenTransfer's secret as optional property
- [#1705] All transfers become monitored per default to make receiving transfers safe
- [#1822] Refactor and optimize TokenNetwork events monitoring: one filter per Tokennetwork
- [#1832] Make Provider events fetching more reliable with Infura

[#249]: https://github.com/raiden-network/light-client/issues/249
[#837]: https://github.com/raiden-network/light-client/issues/837
[#1374]: https://github.com/raiden-network/light-client/issues/1374
[#1421]: https://github.com/raiden-network/light-client/issues/1421
[#1514]: https://github.com/raiden-network/light-client/issues/1514
[#1607]: https://github.com/raiden-network/light-client/issues/1607
[#1610]: https://github.com/raiden-network/light-client/issues/1610
[#1637]: https://github.com/raiden-network/light-client/issues/1637
[#1642]: https://github.com/raiden-network/light-client/issues/1642
[#1649]: https://github.com/raiden-network/light-client/pull/1649
[#1651]: https://github.com/raiden-network/light-client/issues/1651
[#1657]: https://github.com/raiden-network/light-client/issues/1657
[#1690]: https://github.com/raiden-network/light-client/issues/1690
[#1698]: https://github.com/raiden-network/light-client/issues/1698
[#1701]: https://github.com/raiden-network/light-client/pull/1701
[#1708]: https://github.com/raiden-network/light-client/issues/1708
[#1705]: https://github.com/raiden-network/light-client/issues/1705
[#1711]: https://github.com/raiden-network/light-client/pull/1711
[#1761]: https://github.com/raiden-network/light-client/issues/1761
[#1787]: https://github.com/raiden-network/light-client/issues/1787
[#1822]: https://github.com/raiden-network/light-client/pull/1822
[#1830]: https://github.com/raiden-network/light-client/issues/1830
[#1832]: https://github.com/raiden-network/light-client/pull/1832
[#1835]: https://github.com/raiden-network/light-client/pull/1835
[#1848]: https://github.com/raiden-network/light-client/issues/1848
[#1882]: https://github.com/raiden-network/light-client/issues/1882

## [0.9.0] - 2020-05-28
### Added
- [#1473] Expose config$ observable

[#1473]: https://github.com/raiden-network/light-client/issues/1473

### Changed
- [#842] Don't enforce test nets.

[#842]: https://github.com/raiden-network/light-client/issues/842

## [0.8.0] - 2020-05-14
### Added
- [#1369] Monitoring based on channel's balance

[#1369]: https://github.com/raiden-network/light-client/issues/1369

### Changed
- [#1480] Update profile's caps on config.caps change and react on peers updates
- [#1503] Expose received transfers through transfers$ observable

[#1480]: https://github.com/raiden-network/light-client/pull/1480
[#1503]: https://github.com/raiden-network/light-client/issues/1503

## [0.7.0] - 2020-05-08
### Added
- [#1392] Raiden on-chain methods provide easy ways to transfer entire token & ETH balances
- [#1368] Monitoring transfers (experimental)
- [#1252] Mediate transfers (experimental)

[#1392]: https://github.com/raiden-network/light-client/issues/1392
[#1368]: https://github.com/raiden-network/light-client/issues/1368
[#1252]: https://github.com/raiden-network/light-client/issues/1252

### Fixed
- [#1456] Retry without stored setup if auth fails
- [#1434] Ensure past channel events are correctly fetched

[#1456]: https://github.com/raiden-network/light-client/issues/1456
[#1434]: https://github.com/raiden-network/light-client/issues/1434

### Changed
- [#1462] Refactor state schema and types to be simpler and safer

[#1462]: https://github.com/raiden-network/light-client/issues/1462

## [0.6.0] - 2020-04-21
### Added
- [#1338] Allow HTTP URLs for Path Finding Service (non-production)
- [#1261] Implements fast WebRTC P2P transport (experimental)
- [#1211] Integration test for mediated transfers

[#1338]: https://github.com/raiden-network/light-client/issues/1338
[#1261]: https://github.com/raiden-network/light-client/issues/1261
[#1211]: https://github.com/raiden-network/light-client/issues/1211

## [0.5.2] - 2020-04-07
### Fixed
- [#1254] Downgraded contract version 0.36.2

[#1254]: https://github.com/raiden-network/light-client/issues/1254

## [0.5.1] - 2020-04-06
### Added
- [#1209] Support for receiving payments
- [#1254] Bumped contract version to 0.37.0-beta

[#1209]: https://github.com/raiden-network/light-client/issues/1209
[#1254]: https://github.com/raiden-network/light-client/issues/1254

## [0.5.0] - 2020-03-27
### Added
- [#348] Foundation for integration tests w/ Raiden Python client.
- [#774] Reduced size of transpiled bundle.
- [#1209] Added transport capabilities.
- Upgraded `matrix-js-sdk` dependency.

[#348]: https://github.com/raiden-network/light-client/issues/348
[#774]: https://github.com/raiden-network/light-client/issues/744
[#1209]: https://github.com/raiden-network/light-client/issues/1209

### Fixed
- [#1232] Fixed logging.

[#1232]: https://github.com/raiden-network/light-client/issues/1232

## [0.4.2] - 2020-03-05
### Added
- [#1135] Add logging to mint & depositToUDC public methods
- [#152] Enable download of local data (state)

[#152]: https://github.com/raiden-network/light-client/issues/152

### Fixed
- [#1133] Fix minor bug when minting & depositing to UDC for the first time

## [0.4.1] - 2020-03-04
### Changed
- [#1128] Enable faster channel opening & deposit by parallelizing them and their confirmations

### Fixed
- [#1120] Ensure PFS is updated by sending a PFSCapacityUpdate every time our capacity changes
- [#1116] Wait for confirmation blocks after mint & depositToUDC to resolve promise

[#1120]: https://github.com/raiden-network/light-client/issues/1120
[#1128]: https://github.com/raiden-network/light-client/issues/1128
[#1116]: https://github.com/raiden-network/light-client/issues/1116

## [0.4.0] - 2020-02-28
### Added
- [#614] Implement state upgrades and migration
- [#613] Implement waiting for confirmation blocks on on-chain transactions (configurable)
- [#1000] Implemented SDK error handling

### Changed
- [#986] Don't expire locks which secret got registered on-chain
- [#926] Introduce loglevel logging framework (config.logger now specifies logging level)
- [#1042] Support decoding addresses on messages on lowercased format

[#1000]: https://github.com/raiden-network/light-client/issues/1000

## [0.3.0] - 2020-02-07
### Added
- [#172] Add derived subkey support

### Changed
- [#834] Optimize ethers events polling for several tokens
- [#684] Support and require Typescript 3.7
- [#593] Improve PFS url matching.
- Updated Raiden Contracts to 0.36.0

## [0.2] - 2019-11-29
### Added
- Add withdraw request support.
- Add chainId and registry address to the state.
- Add SDK configuration.
- Add PFS find routes functionality.
- Add PFS Capacity Update.
- Add configuration for global rooms & PFS rooms.
- Add PFS safety margin.
- Add ServiceRegistry monitoring.
- Add find PFS functionality.
- Add token minting for testnets
- Add IOU fetching and signing.
- Add UserDeposit capacity retrieving function to the public API.
- Add UserDeposit token address to the public API.
- Add UserDeposit deposit function to the public API.
- Add direct route checking function to the public API.

### Changed
- Update raiden contracts to support Alderaan.
- Update message packing and signature to confront with Alderaan format.
- Optimize past event scanning.
- Make transfer parameters consistent with openChannel.
- Update previous transfer initialization to monitor pending transfers.
- Update the transfer mechanism to accept transfers that are reduced up to 10% due to fees.
- Increase time before leaving unknown rooms.
- Reduce the minimum settle timeout to 20.
- Remove fee field from LockedTransfer to comply with raiden-py.
- Improve matrix transport invite, join algorithm.
- BigNumbers are decoded/encoded as string.

### Fixed
- Fix matrix error handling on user presence.
- Fix matrix re-authentication on config change.
- Fix WithdrawExpired to comply with raiden-py.
- Fix lossless state loading.
- Fix scheduling issues with matrix epics.
- Fix lossless parsing of PFS information.
- Fix past log ordering.
- Fix logging disable not working properly.

### Removed
- Remove Kovan network support.
- Remove requirement for monitored token when calling getTokenInfo|getTokenBalance.

## [0.1.1] - 2019-10-07
### Added
- Add RaidenChannels alias.
- Add monitoring for transfers based on secret hash.

### Changed
- Change transfer api return secret hash.

## [0.1] - 2019-08-21
### Added
- Add token monitoring.
- Add channel lifecycle integration (open/close/settle) with contracts.
- Add channel deposit functionality.
- Add channels$ to the public API.
- Add getTokenBalance and getTokenInfo to public API.
- Add network and events$ to the public API.
- Add account change and network change monitoring.
- Add matrix sdk/transport integration.
- Add protocol message implementation.


[Unreleased]: https://github.com/raiden-network/light-client/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/raiden-network/light-client/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/raiden-network/light-client/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/raiden-network/light-client/compare/v2.0.0-rc.2...v2.0.0
[2.0.0-rc.2]: https://github.com/raiden-network/light-client/compare/v2.0.0-rc.1...v2.0.0-rc.2
[2.0.0-rc.1]: https://github.com/raiden-network/light-client/compare/v1.1.0...v2.0.0-rc.1
[1.1.0]: https://github.com/raiden-network/light-client/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/raiden-network/light-client/compare/v0.17.0...v1.0.0
[0.17.0]: https://github.com/raiden-network/light-client/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/raiden-network/light-client/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/raiden-network/light-client/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/raiden-network/light-client/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/raiden-network/light-client/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/raiden-network/light-client/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/raiden-network/light-client/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/raiden-network/light-client/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/raiden-network/light-client/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/raiden-network/light-client/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/raiden-network/light-client/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/raiden-network/light-client/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/raiden-network/light-client/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/raiden-network/light-client/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/raiden-network/light-client/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/raiden-network/light-client/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/raiden-network/light-client/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/raiden-network/light-client/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/raiden-network/light-client/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/raiden-network/light-client/compare/v0.2...v0.3.0
[0.2]: https://github.com/raiden-network/light-client/compare/v0.1.1...v0.2
[0.1.1]: https://github.com/raiden-network/light-client/compare/v0.1...v0.1.1
[0.1]: https://github.com/raiden-network/light-client/releases/tag/v0.1
