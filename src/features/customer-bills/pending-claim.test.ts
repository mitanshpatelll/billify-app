import { pendingClaim } from './pending-claim';

const mockStore = new Map<string, string>();
jest.mock('@/lib/kv', () => ({
  kvStorage: {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStore.set(key, value),
    removeItem: (key: string) => mockStore.delete(key),
  },
}));

describe('pendingClaim', () => {
  beforeEach(() => mockStore.clear());

  it('hands the waiting token over once', () => {
    pendingClaim.set('tokenA');
    expect(pendingClaim.take()).toEqual({ token: 'tokenA', kind: 'bill' });
    expect(pendingClaim.take()).toBeNull();
  });

  it('forgets a save left at sign-in for half an hour', () => {
    pendingClaim.set('tokenA', 'bill', 0);
    expect(pendingClaim.take(undefined, 31 * 60 * 1000)).toBeNull();
    expect(pendingClaim.take(undefined, 0)).toBeNull(); // removed, not kept for later
  });

  it('remembers a khata page save as one', () => {
    pendingClaim.set('tokenK', 'khata');
    expect(pendingClaim.take('tokenK')).toEqual({ token: 'tokenK', kind: 'khata' });
  });

  it('only hands it to the bill page it came from', () => {
    pendingClaim.set('tokenA');
    expect(pendingClaim.take('tokenB')).toBeNull(); // another bill's page leaves it waiting
    expect(pendingClaim.take('tokenA')).toEqual({ token: 'tokenA', kind: 'bill' });
    expect(pendingClaim.take('tokenA')).toBeNull();
  });
});
