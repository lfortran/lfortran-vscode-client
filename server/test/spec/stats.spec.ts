import { MovingStats } from "../../src/moving-stats";

import { assert } from "chai";

import "mocha";

import fc from "fast-check";

describe("MovingStats", () => {
  it("correctly summarizes the sequence of events", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({
            min: 1e-3,
            max: 50.0,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          {
            minLength: 10,
          }
        ),
        (xs: number[]): void => {
          const n: number = xs.length;

          let expectedMean: number = 0.0;
          for (let i = 0; i < n; i++) {
            expectedMean += (xs[i] / n);
          }

          let expectedVariance: number = 0.0;
          for (let i = 0; i < n; i++) {
            const p = xs[i] - expectedMean;
            expectedVariance += (p * p) / n;
          }

          const expectedStdDev: number = Math.sqrt(expectedVariance);

          let expectedMin: number = Number.MAX_VALUE;
          let expectedMax: number = Number.MIN_VALUE;
          for (let i = 0; i < n; i++) {
            const x = xs[i];
            if (x < expectedMin) {
              expectedMin = x;
            }
            if (x > expectedMax) {
              expectedMax = x;
            }
          }

          const stats: MovingStats = new MovingStats();
          for (let i = 0; i < n; i++) {
            stats.observe(xs[i]);
          }

          assert.equal(stats.getNumSamples(), n);
          assert.equal(stats.getMin(), expectedMin);
          assert.equal(stats.getMax(), expectedMax);

          // NOTE: These are a bit harder to test since the moving statistics
          // are approximate. It is possible that something here may fail when
          // there is not actually a problem -- be especially mindful of the
          // variance assertion.
          const delta: number = 20.0;
          assert.closeTo(stats.getMean(), expectedMean, delta);
          assert.closeTo(stats.getVariance(), expectedVariance, delta * delta);
          assert.closeTo(stats.getStdDev(), expectedStdDev, delta);
        }
      )
    );
  });
});
