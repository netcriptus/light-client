/* eslint-disable @typescript-eslint/no-explicit-any */
import type { providers } from 'ethers';
import { BigNumber, constants, utils } from 'ethers';
import flushPromises from 'flush-promises';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import VueRouter from 'vue-router';
import type { CommitOptions } from 'vuex';
import { Store } from 'vuex';

import type { Address, Hash, OnChange, RaidenTransfer } from 'raiden-ts';
import { EventTypes, Raiden } from 'raiden-ts';

import type { Token, TokenModel } from '@/model/types';
import { RouteNames } from '@/router/route-names';
import type { Configuration } from '@/services/config-provider';
import RaidenService from '@/services/raiden-service';
import type { CombinedStoreState } from '@/store';
import { NotificationContext } from '@/store/notifications/notification-context';
import { NotificationImportance } from '@/store/notifications/notification-importance';
import type { Tokens } from '@/types';

import { paymentId } from './data/mock-data';
import { generateToken } from './utils/data-generator';

jest.mock('vuex');
jest.mock('vue-router');
jest.mock('raiden-ts');
jest.mock('@/i18n', () => ({
  __esModule: true as const,
  default: {
    t: jest.fn((args) => args.toString()),
  },
}));
jest.mock('@/services/config-provider');
const { RaidenError, ErrorCodes, Capabilities } = jest.requireActual('raiden-ts');

const path = [{ path: ['0xmediator'], fee: BigNumber.from(1 ** 10) }];

// It doesn't really matter what we have here. Therefore force type-case it is fine.
const ethereumProvider = {
  url: 'https://some.rpc.provider',
} as unknown as providers.JsonRpcProvider;

describe('RaidenService', () => {
  let raidenService: RaidenService;
  let raiden: jest.Mocked<Raiden>;
  let router: jest.Mocked<VueRouter>;
  let store: jest.Mocked<Store<CombinedStoreState>> & {
    commit: jest.Mock<void, [string, any?, CommitOptions?]>;
  };
  let factory: jest.Mock;

  const setupMock = (mock: jest.Mocked<Raiden>) => {
    mock.getBalance.mockResolvedValue(constants.Zero);
    mock.getTokenBalance.mockResolvedValue(constants.Zero);
    mock.getTokenList.mockResolvedValue(['0xtoken' as Address]);
    mock.getUDCCapacity.mockResolvedValue(constants.Zero);
    mock.userDepositTokenAddress = jest.fn().mockResolvedValue('0xuserdeposittoken' as Address);
    mock.getAvailability.mockResolvedValue({
      userId: '123',
      available: true,
      ts: 0,
    });

    mock.monitorToken.mockResolvedValue('0xaddr' as Address);

    const raidenMock: {
      -readonly [P in keyof Raiden]: Raiden[P];
    } = mock;
    raidenMock.address = '123' as Address;
    raidenMock.channels$ = EMPTY;
    raidenMock.events$ = EMPTY;
    raidenMock.config$ = EMPTY;
    // Emit a dummy transfer event every time raiden is mocked
    raidenMock.transfers$ = of({} as RaidenTransfer).pipe(delay(1000));
    raidenMock.network = {
      name: 'Test',
      chainId: 1337,
    } as providers.Network;
  };

  async function setupSDK({
    presetTokens,
    stateBackup,
    subkey,
  }: {
    stateBackup?: string;
    subkey?: true;
    presetTokens?: Configuration['per_network'];
  } = {}) {
    factory.mockResolvedValue(raiden);
    await raidenService.connect(ethereumProvider, undefined, stateBackup, presetTokens, subkey);
    await flushPromises();
  }

  beforeEach(() => {
    raiden = new (Raiden as any)() as jest.Mocked<Raiden>;
    setupMock(raiden);
    factory = Raiden.create = jest.fn();
    store = new Store({}) as typeof store;
    (store.state as any) = {
      userDepositContract: { token: undefined },
    };
    router = new VueRouter() as jest.Mocked<VueRouter>;
    router.push = jest.fn();
    raidenService = new RaidenService(store, router);
  });

  afterEach(() => {
    window.web3 = undefined;
    window.ethereum = undefined;
  });

  test('throw an error when the user calls getAccount before connecting', async () => {
    expect(raidenService.getAccount).toThrow('Raiden instance was not initialized');
  });

  test('raidenAccountBalance should be fetched when subkey is used', async () => {
    raiden.getBalance = jest
      .fn()
      .mockResolvedValueOnce(BigNumber.from('1000000000000000000'))
      .mockResolvedValueOnce(BigNumber.from('100000000000000000'));

    await setupSDK({
      stateBackup: '',
      subkey: true,
    });
    expect(store.commit).toHaveBeenCalledWith('balance', '1.0');
    expect(store.commit).toBeCalledWith('raidenAccountBalance', '0.1');
  });

  test('throw an error when the user calls openChannel before calling connect', async () => {
    expect.assertions(1);
    await expect(
      raidenService.openChannel('0xaddr', '0xhub', BigNumber.from(5000)),
    ).rejects.toThrowError('Raiden instance was not initialized');
  });

  describe('after sdk is initialized', () => {
    beforeEach(async () => {
      await setupSDK();
    });

    test('return a token object from getTokenBalance when there is no exception', async () => {
      const balance = BigNumber.from('1000000000000000000');

      raiden.getTokenBalance = jest.fn().mockResolvedValue(balance);
      raiden.getTokenInfo = jest.fn().mockResolvedValue({
        decimals: 18,
        name: 'Test Token 1',
        symbol: 'TT1',
        totalSupply: BigNumber.from(1221),
      });

      await raidenService.fetchAndUpdateTokenData(['0xtoken']);
      expect(store.commit).toHaveBeenCalledWith(
        'updateTokens',
        expect.objectContaining({
          '0xtoken': {
            decimals: 18,
            address: '0xtoken',
            balance,
            name: 'Test Token 1',
            symbol: 'TT1',
          } as Token,
        } as Tokens),
      );
      expect(raiden.getTokenBalance).toHaveBeenCalledTimes(1);
      expect(raiden.getTokenBalance).toHaveBeenCalledWith('0xtoken');
      expect(raiden.getTokenInfo).toHaveBeenCalledTimes(1);
      expect(raiden.getTokenInfo).toHaveBeenCalledWith('0xtoken');
    });

    test('return the account when the sdk is connected', async () => {
      expect(raidenService.getAccount()).toBe('123');
    });

    test('returns token balance as string', async () => {
      const balance = BigNumber.from('1000000000000000000');
      raiden.getTokenBalance = jest.fn().mockResolvedValue(balance);
      const tokenBalance = await raidenService.getTokenBalance('0xtoken');

      expect(raiden.getTokenBalance).toHaveBeenCalledTimes(1);
      expect(raiden.getTokenBalance).toHaveBeenCalledWith('0xtoken', undefined);
      expect(tokenBalance).toEqual(balance);
    });

    test('resolves when channel open and deposit are successful', async () => {
      raiden.openChannel.mockImplementation(
        async ({}, {}, _?, callback?: OnChange<EventTypes, any>): Promise<any> => {
          callback?.({ type: EventTypes.OPENED, payload: { txHash: '0xtxhash' } });
          return '0xtxhash';
        },
      );

      const progress = jest.fn();

      const depositAmount = BigNumber.from(100);
      await expect(
        raidenService.openChannel('0xtoken', '0xpartner', depositAmount, progress),
      ).resolves.toBeUndefined();
      expect(raiden.openChannel).toBeCalledTimes(1);
      expect(raiden.openChannel).toBeCalledWith(
        '0xtoken',
        '0xpartner',
        { deposit: expect.any(BigNumber) },
        expect.any(Function),
      );

      expect(progress).toHaveBeenCalled();
    });

    test('throw an exception when channel open fails', async () => {
      expect.assertions(1);
      const error = new RaidenError(ErrorCodes.CNL_OPENCHANNEL_FAILED);
      raiden.openChannel = jest.fn().mockRejectedValue(error);

      const depositAmount = BigNumber.from(100);
      await expect(
        raidenService.openChannel('0xtoken', '0xpartner', depositAmount),
      ).rejects.toThrow(RaidenError);
    });

    test('call stop when disconnect is called', async () => {
      raidenService.disconnect();
      expect(raiden.stop).toHaveBeenCalledTimes(1);
      expect(raiden.start).toHaveBeenCalledTimes(1);
    });

    test('resolves successfully when the channel closes', async () => {
      raiden.closeChannel.mockResolvedValue('0xthash' as Hash);
      await raidenService.closeChannel('0xtoken', '0xpartner');
      expect(raiden.closeChannel).toHaveBeenCalledTimes(1);
      expect(raiden.closeChannel).toHaveBeenCalledWith('0xtoken', '0xpartner');
    });

    test('throw an exception when close fails', async () => {
      expect.assertions(3);
      const error = new RaidenError(ErrorCodes.CNL_CLOSECHANNEL_FAILED);
      raiden.closeChannel.mockRejectedValue(error);

      await expect(raidenService.closeChannel('0xtoken', '0xpartner')).rejects.toThrowError(
        RaidenError,
      );
      expect(raiden.closeChannel).toHaveBeenCalledTimes(1);
      expect(raiden.closeChannel).toHaveBeenCalledWith('0xtoken', '0xpartner');
    });

    test('resolves when deposit is successful', async () => {
      expect.assertions(2);
      raiden.depositChannel.mockResolvedValue('0xtxhash' as Hash);

      const depositAmount = BigNumber.from(6000);
      await raidenService.deposit('0xtoken', '0xpartner', depositAmount);
      expect(raiden.depositChannel).toHaveBeenCalledTimes(1);
      expect(raiden.depositChannel).toHaveBeenCalledWith('0xtoken', '0xpartner', depositAmount);
    });

    test('throw when deposit fails', async () => {
      expect.assertions(3);
      const error = new RaidenError(ErrorCodes.RDN_DEPOSIT_TRANSACTION_FAILED);
      raiden.depositChannel.mockRejectedValue(error);

      const depositAmount = BigNumber.from(6000);
      await expect(
        raidenService.deposit('0xtoken', '0xpartner', depositAmount),
      ).rejects.toThrowError(RaidenError);
      expect(raiden.depositChannel).toHaveBeenCalledTimes(1);
      expect(raiden.depositChannel).toHaveBeenCalledWith('0xtoken', '0xpartner', depositAmount);
    });

    test('resolves when withdraw is successful', async () => {
      expect.assertions(2);
      raiden.withdrawChannel.mockResolvedValue('0xtxhash' as Hash);

      const withdrawAmount = BigNumber.from(6000);
      await raidenService.withdraw('0xtoken', '0xpartner', withdrawAmount);
      expect(raiden.withdrawChannel).toHaveBeenCalledTimes(1);
      expect(raiden.withdrawChannel).toHaveBeenCalledWith('0xtoken', '0xpartner', withdrawAmount);
    });

    test('throw when withdraw fails', async () => {
      expect.assertions(3);
      const error = new RaidenError(ErrorCodes.RDN_WITHDRAW_TRANSACTION_FAILED);
      raiden.withdrawChannel.mockRejectedValue(error);

      const withdrawAmount = BigNumber.from(6000);
      await expect(
        raidenService.withdraw('0xtoken', '0xpartner', withdrawAmount),
      ).rejects.toThrowError(RaidenError);
      expect(raiden.withdrawChannel).toHaveBeenCalledTimes(1);
      expect(raiden.withdrawChannel).toHaveBeenCalledWith('0xtoken', '0xpartner', withdrawAmount);
    });

    describe('settleChannel', () => {
      test('resolves when settle is successful', async () => {
        raiden.settleChannel = jest.fn().mockResolvedValue('txhash' as Hash);
        await expect(raidenService.settleChannel('0xtoken', '0xpartner')).resolves.toBeUndefined();
        expect(raiden.settleChannel).toHaveBeenCalledTimes(1);
        expect(raiden.settleChannel).toHaveBeenCalledWith('0xtoken', '0xpartner');
      });

      test('throw when settle fails', async () => {
        const error = new RaidenError(ErrorCodes.CNL_SETTLECHANNEL_FAILED);
        raiden.settleChannel = jest.fn().mockRejectedValue(error);
        await expect(raidenService.settleChannel('0xtoken', '0xpartner')).rejects.toThrowError(
          RaidenError,
        );
        expect(raiden.settleChannel).toHaveBeenCalledTimes(1);
        expect(raiden.settleChannel).toHaveBeenCalledWith('0xtoken', '0xpartner');
      });
    });
    describe('transfer', () => {
      test('resolves when a transfer succeeds', async () => {
        raiden.waitTransfer.mockResolvedValue(null as any);

        await expect(
          raidenService.transfer('0xtoken', '0xpartner', constants.One, paymentId, path),
        ).resolves.toBeUndefined();
        expect(raiden.transfer).toHaveBeenCalledTimes(1);
        expect(raiden.transfer).toHaveBeenCalledWith('0xtoken', '0xpartner', constants.One, {
          paths: path,
          paymentId,
        });
      });

      test('throw when a transfer fails', async () => {
        const error = new RaidenError(ErrorCodes.XFER_REFUNDED);
        raiden.waitTransfer.mockRejectedValue(error);

        await expect(
          raidenService.transfer('0xtoken', '0xpartner', constants.One, paymentId, path),
        ).rejects.toThrow(RaidenError);
        expect(raiden.transfer).toHaveBeenCalledTimes(1);
        expect(raiden.transfer).toHaveBeenCalledWith('0xtoken', '0xpartner', constants.One, {
          paths: path,
          paymentId,
        });
      });
    });

    test('resolves an ens domain', async () => {
      (raiden as any).resolveName = jest.fn().mockResolvedValue(constants.AddressZero as Address);

      expect(await raidenService.ensResolve('domain.eth')).toEqual(constants.AddressZero);
      expect(raiden.resolveName).toHaveBeenCalledTimes(1);
    });

    test('resolves a list of the available path-finding services', async () => {
      raiden.findPFS.mockResolvedValueOnce([]);
      await expect(raidenService.fetchServices()).resolves.toEqual([]);
    });

    test('rejects when there is an error while getting the available path-finding services', async () => {
      raiden.findPFS.mockRejectedValue(new Error('failed'));
      await expect(raidenService.fetchServices()).rejects.toBeInstanceOf(Error);
    });

    describe('findRoutes', () => {
      test('rejects when it cannot find routes: no routes', async () => {
        const error = new Error('no path');
        raiden.getAvailability = jest.fn().mockResolvedValue(constants.AddressZero);
        raiden.findRoutes = jest.fn().mockRejectedValue(error);

        await expect(
          raidenService.findRoutes(constants.AddressZero, constants.AddressZero, constants.One),
        ).rejects.toEqual(error);
      });

      test('resolves when it can find routes', async () => {
        raiden.getAvailability = jest.fn().mockResolvedValueOnce(constants.AddressZero);
        raiden.findRoutes = jest.fn().mockResolvedValueOnce([]);

        await expect(
          raidenService.findRoutes(constants.AddressZero, constants.AddressZero, constants.One),
        ).resolves.toEqual([]);
      });
    });

    describe('availability', () => {
      test('returns true when target is online', async () => {
        raiden.getAvailability = jest.fn().mockResolvedValue({ available: true });

        const isAvailable = await raidenService.getAvailability('0xtarget');
        expect(isAvailable).toBe(true);
        expect(raiden.getAvailability).toHaveBeenCalledTimes(1);
      });

      test('returns false when target is offline', async () => {
        raiden.getAvailability = jest.fn().mockRejectedValue({});

        const isAvailable = await raidenService.getAvailability('0xtarget');
        expect(isAvailable).toBe(false);
        expect(raiden.getAvailability).toHaveBeenCalledTimes(1);
        expect(store.commit).toBeCalledWith('updatePresence', {
          ['0xtarget']: false,
        });
      });

      test('save transfers in store', async () => {
        const dummyTransfer = {
          initiator: '123',
          key: 'sent:0x1',
          completed: false,
        };
        (raiden as any).transfers$ = new BehaviorSubject(dummyTransfer);
        factory.mockResolvedValue(raiden);

        await raidenService.connect(ethereumProvider);
        await flushPromises();

        expect(store.commit).toHaveBeenCalledWith(
          'updateTransfers',
          expect.objectContaining({
            ...dummyTransfer,
          } as RaidenTransfer),
        );
      });
    });

    describe('raiden account balances', () => {
      beforeEach(async () => {
        const stub = new BehaviorSubject({});
        raiden.getTokenList = jest.fn().mockResolvedValue([]);
        factory.mockResolvedValue(raiden);
        stub.next({});
        await raidenService.connect(ethereumProvider);
      });

      test('empty list is returned if not subkey', async () => {
        await expect(raidenService.getRaidenAccountBalances()).resolves.toStrictEqual([]);
      });

      describe('with tokens and subkey', () => {
        const createToken = (address: string) => ({
          address,
          name: address,
          symbol: address.toLocaleUpperCase(),
          decimals: 18,
          balance: constants.Zero,
        });

        beforeEach(() => {
          (raiden as any).mainAddress = '0x001';
          raiden.getTokenList = jest.fn().mockResolvedValue(['0x1', '0x2']);
        });

        test('return empty list if no balances are found', async () => {
          await expect(raidenService.getRaidenAccountBalances()).resolves.toStrictEqual([]);
        });

        describe('with balances', () => {
          const tokens = [
            {
              ...createToken('0x1'),
              balance: constants.One,
            },
            {
              ...createToken('0x2'),
              balance: constants.One,
            },
          ];

          beforeEach(() => {
            raiden.getTokenBalance = jest.fn().mockResolvedValue(constants.One);
            raiden.getTokenInfo = jest
              .fn()
              .mockImplementation(async (address: string) => createToken(address));
          });

          test('load from chain if no token info is cached', async () => {
            (store.state as any) = {
              tokens: {},
            };

            await expect(raidenService.getRaidenAccountBalances()).resolves.toMatchObject(tokens);
            expect(raiden.getTokenInfo).toHaveBeenCalledTimes(2);
          });

          test('load from cache if found', async () => {
            (store.state as any) = {
              tokens: {
                '0x1': {
                  ...createToken('0x1'),
                },
              },
            };

            await expect(raidenService.getRaidenAccountBalances()).resolves.toMatchObject(tokens);
            expect(raiden.getTokenInfo).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  });

  describe('token caching', () => {
    const mockToken1 = '0xtoken1';
    const mockToken2 = '0xtoken2';

    const mockToken = (address: string): Token => ({
      address: address,
      balance: constants.Zero,
      decimals: 18,
      name: address,
      symbol: address.replace('0x', '').toLocaleUpperCase(),
    });

    const tokens: Tokens = {};
    tokens[mockToken1] = mockToken(mockToken1);
    tokens[mockToken2] = mockToken(mockToken2);

    beforeEach(() => {
      store.commit = jest.fn();

      raiden.getTokenList = jest.fn().mockResolvedValue([mockToken1, mockToken2]);
      raiden.getTokenInfo = jest.fn().mockImplementation(mockToken);

      factory.mockResolvedValue(raiden);
    });

    describe('with existing state', () => {
      beforeEach(() => {
        const mockStore = store as any;
        mockStore.state = {
          tokens: {
            [mockToken1]: {
              address: mockToken1,
            },
            [mockToken2]: {
              address: mockToken2,
            },
          },
        };
        mockStore.getters = {
          tokens: [{ address: mockToken1 } as TokenModel],
        };
      });

      test('updates the tokens when it fetches a non-cached token ', async () => {
        await raidenService.connect(ethereumProvider);
        await flushPromises();

        expect(store.commit).toBeCalledWith('account', '123');
        expect(store.commit).toBeCalledWith('balance', '0.0');

        await raidenService.fetchAndUpdateTokenData(['0xtoken1']);

        expect(store.commit).toHaveBeenLastCalledWith('updateTokens', {
          [mockToken1]: tokens[mockToken1],
        });
      });
    });

    test('loads the token list', async () => {
      raiden.getTokenList = jest.fn().mockResolvedValue([mockToken1, mockToken2]);
      raiden.getTokenBalance = jest.fn().mockResolvedValue(BigNumber.from(100));
      raiden.getTokenInfo = jest.fn().mockResolvedValue({
        decimals: 0,
        symbol: 'MKT',
        name: 'Mock Token',
      });

      await setupSDK();

      store.commit.mockReset();
      await raidenService.fetchTokenList();
      await flushPromises();
      expect(store.commit).toHaveBeenCalledWith(
        'updateTokens',
        expect.objectContaining({
          [mockToken1]: { address: mockToken1 },
          [mockToken2]: { address: mockToken2 },
        }),
      );
      expect(store.commit).toHaveBeenCalledWith(
        'updateTokens',
        expect.objectContaining({
          [mockToken1]: {
            address: mockToken1,
            balance: BigNumber.from(100),
            decimals: 0,
            symbol: 'MKT',
            name: 'Mock Token',
          },
        }),
      );
    });
  });

  test('clears the app state when it receives a raidenShutdown event', async () => {
    expect.assertions(1);

    const mockStore = store as any;
    mockStore.getters = {
      tokens: [],
    };
    mockStore.state = {
      tokens: {},
    };

    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    raiden.getTokenList = jest.fn().mockResolvedValue([]);
    await setupSDK();
    subject.next({ type: 'raiden/shutdown' });
    await flushPromises();

    expect(store.commit).toHaveBeenLastCalledWith('reset');
  });

  test('navigates to home screen when it receives a raidenShutdown event', async () => {
    expect.assertions(1);

    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({ type: 'raiden/shutdown' });
    await flushPromises();

    expect(router.push).toHaveBeenCalledWith({ name: RouteNames.HOME });
  });

  test('commit config$ updates', async () => {
    expect.assertions(1);

    const subject = new BehaviorSubject({});
    (raiden as any).config$ = subject;
    await setupSDK();
    const config = { caps: { [Capabilities.NO_RECEIVE]: true } };
    subject.next(config);

    expect(store.commit).toHaveBeenCalledWith('updateConfig', config);
  });

  test('notify that monitor balance proof was send', async () => {
    expect.assertions(1);
    (store.state as any) = {
      userDepositContract: { token: {} },
    };
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'ms/balanceProof/sent',
      payload: {
        monitoringService: '0x1234',
        partner: '0x1001',
        reward: utils.parseEther('5'),
        txHash: '0x0001',
        confirmed: true,
      },
      meta: {},
    });

    await flushPromises();

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      description: 'notifications.ms-balance-proof.description',
      title: 'notifications.ms-balance-proof.title',
      importance: NotificationImportance.HIGH,
      context: NotificationContext.INFO,
    });
  });

  test('notify that tokens have been withdrawn from user deposit contract', async () => {
    expect.assertions(1);
    (store.state as any) = {
      userDepositContract: { token: generateToken() },
    };
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();

    subject.next({
      type: 'udc/withdraw/success',
      payload: {
        withdrawal: utils.parseEther('5'),
        confirmed: true,
      },
      meta: {
        amount: utils.parseEther('5'),
      },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      icon: 'notifications.withdrawn.icon',
      title: 'notifications.withdrawn.title',
      description: 'notifications.withdrawn.description',
      importance: NotificationImportance.HIGH,
      context: NotificationContext.INFO,
    });
  });

  test('notification that tokens have been withdrawn from user deposit contract includes link for subkey', async () => {
    expect.assertions(1);
    (store.state as any) = {
      userDepositContract: { token: generateToken() },
    };
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK({ subkey: true });

    subject.next({
      type: 'udc/withdraw/success',
      payload: {
        withdrawal: utils.parseEther('5'),
        confirmed: true,
      },
      meta: {
        amount: utils.parseEther('5'),
      },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      icon: 'notifications.withdrawn.icon',
      title: 'notifications.withdrawn.title',
      description: 'notifications.withdrawn.description',
      importance: NotificationImportance.HIGH,
      context: NotificationContext.INFO,
      link: 'notifications.withdrawn.link',
      dappRoute: RouteNames.ACCOUNT_WITHDRAWAL,
    });
  });

  test('do not notify that withdraw failed if validation error', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'udc/withdraw/plan/failure',
      payload: {
        code: 'UDC_PLAN_WITHDRAW_EXCEEDS_AVAILABLE',
      },
      meta: {
        amount: utils.parseEther('5'),
      },
    });

    expect(store.dispatch).toHaveBeenCalledTimes(0);
  });

  test('notify that withdraw failed', async () => {
    expect.assertions(1);
    (store.state as any) = {
      userDepositContract: { token: generateToken() },
    };
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'udc/withdraw/plan/failure',
      payload: {
        code: -3200,
        message: 'gas',
      },
      meta: {
        amount: utils.parseEther('5'),
      },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      description: 'notifications.withdrawal.failure.description',
      title: 'notifications.withdrawal.failure.title',
      importance: NotificationImportance.HIGH,
      context: NotificationContext.ERROR,
    });
  });

  test('token monitored', async () => {
    expect.assertions(1);
    (store.state as any) = {
      userDepositContract: { token: generateToken() },
    };
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();

    subject.next({
      type: 'token/monitored',
      payload: {
        token: '0x1234',
      },
      meta: {
        amount: utils.parseEther('5'),
      },
    });

    expect(store.commit).toHaveBeenCalledWith('updateTokens', {
      '0x1234': { address: '0x1234' },
    });
  });

  test('update presence', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();

    subject.next({
      type: 'matrix/presence/success',
      payload: {
        available: true,
      },
      meta: {
        address: '0x1234',
      },
    });

    expect(store.commit).toHaveBeenCalledWith('updatePresence', {
      '0x1234': true,
    });
  });

  test('pre-set tokens are monitored', async () => {
    expect.assertions(1);
    const presetTokens = { '1337': { monitored: ['0xtoken'] } };
    await setupSDK({ presetTokens });
    expect(raiden.monitorToken).toHaveBeenCalledWith('0xtoken');
  });

  test('ignore successful channel settle is not confirmed yet', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'channel/settle/success',
      payload: {
        id: 0,
        txHash: '0xTxHash',
        txBlock: '0TxBlock',
        confirmed: false,
      },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).not.toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.settlement.success.title',
      description: 'notifications.settlement.success.description',
      context: NotificationContext.INFO,
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel settle was successful', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'channel/settle/success',
      payload: {
        id: 0,
        txHash: '0xTxHash',
        txBlock: '0TxBlock',
        confirmed: true,
      },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.settlement.success.title',
      description: 'notifications.settlement.success.description',
      icon: 'notifications.settlement.icon',
      context: NotificationContext.NONE,
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel settle was failure', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'channel/settle/failure',
      payload: { message: 'error message' },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.settlement.failure.title',
      description: 'notifications.settlement.failure.description',
      icon: 'notifications.settlement.icon',
      context: NotificationContext.NONE,
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel open failed', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    subject.next({
      type: 'channel/open/failure',
      payload: { message: 'error message' },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.channel-open.failure.title',
      description: 'notifications.channel-open.failure.description',
      icon: 'notifications.channel-open.icon',
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel open success', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    (store.state as any) = { config: { confirmationBlocks: 5 } };
    subject.next({
      type: 'channel/open/success',
      payload: {
        id: 0,
        txHash: '0xTxHash',
        txBlock: 0,
        confirmed: undefined,
      },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });
    await flushPromises();

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.channel-open.success.title',
      description: 'notifications.channel-open.success.description',
      icon: 'notifications.channel-open.icon',
      txHash: '0xTxHash',
      txConfirmationBlock: 5,
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel open succeed with state confirmed', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    (store.state as any) = { config: { confirmationBlocks: 5 } };
    subject.next({
      type: 'channel/open/success',
      payload: {
        id: 0,
        txHash: '0xTxHash',
        txBlock: 0,
        confirmed: true,
      },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.channel-open.success.title',
      description: 'notifications.channel-open.success.description',
      icon: 'notifications.channel-open.icon',
      txHash: '0xTxHash',
      txConfirmationBlock: 5,
      importance: NotificationImportance.HIGH,
    });
  });

  test('notify that channel open failed when confirmation is false', async () => {
    expect.assertions(1);
    const subject = new BehaviorSubject({});
    (raiden as any).events$ = subject;
    await setupSDK();
    (store.state as any) = { config: { confirmationBlocks: 5 } };
    subject.next({
      type: 'channel/open/success',
      payload: {
        id: 0,
        txHash: '0xTxHash',
        txBlock: 0,
        confirmed: false,
      },
      meta: { tokenNetwork: '0xTokenNetwork', partner: '0xPartner' },
    });

    expect(store.commit).toHaveBeenCalledWith('notifications/notificationAddOrReplace', {
      title: 'notifications.channel-open.failure.title',
      description: 'notifications.channel-open.failure.description',
      icon: 'notifications.channel-open.icon',
      txHash: '0xTxHash',
      txConfirmationBlock: 5,
      importance: NotificationImportance.HIGH,
    });
  });

  describe('updates planned user deposit withdrawal', () => {
    test('update state for pending or confirmed withdraw plan', async () => {
      const subject = new BehaviorSubject({});
      (raiden as any).events$ = subject;
      await setupSDK();
      subject.next({
        type: 'udc/withdraw/plan/success',
        payload: {
          block: 5,
          txHash: '0xTxHash',
          txBlock: 1,
          confirmed: true,
        },
        meta: { amount: constants.One },
      });

      expect(store.commit).toHaveBeenCalledWith('userDepositContract/setPlannedWithdrawal', {
        txHash: '0xTxHash',
        txBlock: 1,
        amount: constants.One,
        withdrawBlock: 5,
        confirmed: true,
      });
    });

    test('clears state when planned withdraw got reorged', async () => {
      const subject = new BehaviorSubject({});
      (raiden as any).events$ = subject;
      await setupSDK();
      subject.next({
        type: 'udc/withdraw/plan/success',
        payload: {
          block: 5,
          txHash: '0xTxHash',
          txBlock: 1,
          confirmed: false,
        },
        meta: { amount: constants.One },
      });

      expect(store.commit).toHaveBeenCalledWith('userDepositContract/clearPlannedWithdrawal');
    });

    test('clears state after confirmed withraw', async () => {
      (store.state as any) = {
        userDepositContract: { token: generateToken() },
      };
      const subject = new BehaviorSubject({});
      (raiden as any).events$ = subject;
      await setupSDK();
      subject.next({
        type: 'udc/withdraw/success',
        payload: {
          confirmed: true,
          withdrawal: constants.One,
        },
        meta: {
          amount: constants.One,
        },
      });

      expect(store.commit).toHaveBeenCalledWith('userDepositContract/clearPlannedWithdrawal');
    });
  });
});
