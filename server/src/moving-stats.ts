/**
 * Computes the moving average and variance using Welford's online algorithm,
 * along with various other moving statistics.
 */
export class MovingStats {
  public numSamples: number = 0;
  public mean: number = 0.0;
  public variance: number = 0.0;
  public min: number = Number.MAX_VALUE;
  public max: number = Number.MIN_VALUE;

  public getNumSamples(): number {
    return this.numSamples;
  }

  public getMean(): number {
    return this.mean;
  }

  public getVariance(): number {
    return this.variance;
  }

  public getStdDev(): number {
    if (this.variance != 0.0) {
      return Math.sqrt(this.variance);
    }
    return 0.0;
  }

  public getMin(): number {
    return this.min;
  }

  public getMax(): number {
    return this.max;
  }

  observe(value: number): void {
    const numSamples = 1 + this.numSamples;
    if (this.numSamples > 1) {
      let mean: number = this.mean;
      let variance: number = this.variance;

      const p1: number = value - mean;
      mean += (p1 / numSamples);

      const p2: number = value - mean;
      variance += (((p1 * p2) - variance) / numSamples);

      this.mean = mean;
      this.variance = variance;
    } else {
      this.mean = value;
    }
    this.numSamples = numSamples;

    if (value < this.min) {
      this.min = value;
    }

    if (value > this.max) {
      this.max = value;
    }
  }
}
