import path from "path";
import * as os from "os";

import { ExampleSettings } from "../../src/lfortran-types";

const scriptName: string = ((os.platform() === "win32")
  ? "lfortran.ps1"
  : "lfortran.sh");

export const settings: ExampleSettings = {
  maxNumberOfProblems: 100,
  compiler: {
    // lfortranPath: path.join(__dirname, "..", "bin", scriptName)
    lfortranPath: "<error: please stub with sinon>",
  }
};
