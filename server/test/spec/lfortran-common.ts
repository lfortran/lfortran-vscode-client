import path from "path";

import { ExampleSettings } from "../../src/lfortran-types";

export const settings: ExampleSettings = {
  maxNumberOfProblems: 100,
  compiler: {
    lfortranPath: path.join(__dirname, "..", "bin", "lfortran")
  }
};
