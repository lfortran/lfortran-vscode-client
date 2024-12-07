import { LFortranSettings } from "../../src/lfortran-types";

export const settings: LFortranSettings = {
  maxNumberOfProblems: 100,
  compiler: {
    lfortranPath: "<error: please stub with sinon>",
  },
  log: {
    level: "off",
    benchmark: false,
    filter: "",
    prettyPrint: false,
    indentSize: 0,
  },
};
