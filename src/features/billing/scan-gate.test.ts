import { createScanGate, isStorableBarcode } from './scan-gate';

const MAGGI = '8901058851298';
const SALT = '8904043901015';

/** The camera reporting `code` every 100 ms from `from` to `to`. */
function hold(gate: ReturnType<typeof createScanGate>, code: string, from: number, to: number) {
  let accepted = 0;
  for (let t = from; t <= to; t += 100) if (gate.accept(code, t)) accepted++;
  return accepted;
}

describe('createScanGate', () => {
  it('counts a packet held still in front of the lens once, however long', () => {
    const gate = createScanGate();
    expect(hold(gate, MAGGI, 0, 5_000)).toBe(1);
  });

  it('counts the same packet again after it leaves the view and comes back', () => {
    const gate = createScanGate();
    expect(hold(gate, MAGGI, 0, 1_000)).toBe(1);
    // out of view for 0.8 s
    expect(hold(gate, MAGGI, 1_800, 2_500)).toBe(1);
  });

  it('takes a different packet after a short pause, not instantly', () => {
    const gate = createScanGate();
    expect(gate.accept(MAGGI, 0)).toBe(true);
    expect(gate.accept(SALT, 300)).toBe(false);
    expect(gate.accept(SALT, 700)).toBe(true);
  });

  it('after a pause (sheet open), the packet still being held is not counted again', () => {
    const gate = createScanGate();
    expect(gate.accept(MAGGI, 0)).toBe(true);
    // quick add was open for 10 s, camera off; it comes back with the packet still in view
    gate.resume(10_000);
    expect(hold(gate, MAGGI, 10_000, 12_000)).toBe(0);
    // moved away and back
    expect(hold(gate, MAGGI, 13_000, 13_500)).toBe(1);
  });
});

it('only stores barcodes the server accepts', () => {
  expect(isStorableBarcode(MAGGI)).toBe(true);
  expect(isStorableBarcode('SK-0042')).toBe(true);
  expect(isStorableBarcode('https://example.com/x')).toBe(false);
  expect(isStorableBarcode('')).toBe(false);
});
