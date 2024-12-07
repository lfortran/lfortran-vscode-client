import {
  Logger,
  LogLevel,
} from "../../src/logger";

import { assert } from "chai";

import "mocha";

import * as sinon from 'sinon';

const LOG_CONTEXT: string = "LOGGER_SPEC";

describe("Logger", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    sinon.stub(logger, "printFormat").returns(undefined);
  });

  describe("isBenchmarkEnabled", () => {
    it("returns false when enableBenchmark is false", () => {
      logger.enableBenchmark = false;
      assert.isFalse(logger.isBenchmarkEnabled());
    });

    it("returns true when enableBenchmark is true", () => {
      logger.enableBenchmark = true;
      assert.isTrue(logger.isBenchmarkEnabled());
    });
  });

  describe("benchmark", () => {
    it("does nothing when enableBenchmark is false", () => {
      logger.enableBenchmark = false;
      logger.benchmark(LOG_CONTEXT, "foo", performance.now());
      assert.isFalse(logger.printFormat.called);
    });

    it("logs a message when enableBenchmark is true", () => {
      logger.enableBenchmark = true;
      logger.benchmark(LOG_CONTEXT, "foo", performance.now());
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("areAllDisabled", () => {
    it("returns true when logger.level is LogLevel.OFF", () => {
      logger.level = LogLevel.OFF;
      assert.isTrue(logger.areAllDisabled());
    });

    it("returns false when logger.level is anything but LogLevel.OFF", () => {
      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.WARN;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.INFO;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.DEBUG;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.TRACE;
      assert.isFalse(logger.areAllDisabled());

      logger.level = LogLevel.ALL;
      assert.isFalse(logger.areAllDisabled());
    });
  });

  describe("isFatalEnabled", () => {
    it("returns false when logger.level is below LogLevel.FATAL", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isFatalEnabled());
    });

    it("returns true when logger.level is at least LogLevel.FATAL", () => {
      logger.level = LogLevel.FATAL;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.ERROR;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.WARN;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.INFO;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isFatalEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isFatalEnabled());
    });
  });

  describe("isErrorEnabled", () => {
    it("returns false when logger.level is below LogLevel.ERROR", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isErrorEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.isErrorEnabled());
    });

    it("returns true when logger.level is at least LogLevel.ERROR", () => {
      logger.level = LogLevel.ERROR;
      assert.isTrue(logger.isErrorEnabled());

      logger.level = LogLevel.WARN;
      assert.isTrue(logger.isErrorEnabled());

      logger.level = LogLevel.INFO;
      assert.isTrue(logger.isErrorEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isTrue(logger.isErrorEnabled());

      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isErrorEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isErrorEnabled());
    });
  });

  describe("isWarnEnabled", () => {
    it("returns false when logger.level is below LogLevel.WARN", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isWarnEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.isWarnEnabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.isWarnEnabled());
    });

    it("returns true when logger.level is at least LogLevel.WARN", () => {
      logger.level = LogLevel.WARN;
      assert.isTrue(logger.isWarnEnabled());

      logger.level = LogLevel.INFO;
      assert.isTrue(logger.isWarnEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isTrue(logger.isWarnEnabled());

      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isWarnEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isWarnEnabled());
    });
  });

  describe("isInfoEnabled", () => {
    it("returns false when logger.level is below LogLevel.INFO", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isInfoEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.isInfoEnabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.isInfoEnabled());

      logger.level = LogLevel.WARN;
      assert.isFalse(logger.isInfoEnabled());
    });

    it("returns true when logger.level is at least LogLevel.INFO", () => {
      logger.level = LogLevel.INFO;
      assert.isTrue(logger.isInfoEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isTrue(logger.isInfoEnabled());

      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isInfoEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isInfoEnabled());
    });
  });

  describe("isDebugEnabled", () => {
    it("returns false when logger.level is below LogLevel.DEBUG", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isDebugEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.isDebugEnabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.isDebugEnabled());

      logger.level = LogLevel.WARN;
      assert.isFalse(logger.isDebugEnabled());

      logger.level = LogLevel.INFO;
      assert.isFalse(logger.isDebugEnabled());
    });

    it("returns true when logger.level is at least LogLevel.DEBUG", () => {
      logger.level = LogLevel.DEBUG;
      assert.isTrue(logger.isDebugEnabled());

      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isDebugEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isDebugEnabled());
    });
  });

  describe("isTraceEnabled", () => {
    it("returns false when logger.level is below LogLevel.TRACE", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.isTraceEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.isTraceEnabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.isTraceEnabled());

      logger.level = LogLevel.WARN;
      assert.isFalse(logger.isTraceEnabled());

      logger.level = LogLevel.INFO;
      assert.isFalse(logger.isTraceEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isFalse(logger.isTraceEnabled());
    });

    it("returns true when logger.level is at least LogLevel.TRACE", () => {
      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.isTraceEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.isTraceEnabled());
    });
  });

  describe("areAllEnabled", () => {
    it("returns false when logger.level is below LogLevel.TRACE", () => {
      logger.level = LogLevel.OFF;
      assert.isFalse(logger.areAllEnabled());

      logger.level = LogLevel.FATAL;
      assert.isFalse(logger.areAllEnabled());

      logger.level = LogLevel.ERROR;
      assert.isFalse(logger.areAllEnabled());

      logger.level = LogLevel.WARN;
      assert.isFalse(logger.areAllEnabled());

      logger.level = LogLevel.INFO;
      assert.isFalse(logger.areAllEnabled());

      logger.level = LogLevel.DEBUG;
      assert.isFalse(logger.areAllEnabled());
    });

    it("returns true when logger.level is at least LogLevel.TRACE", () => {
      logger.level = LogLevel.TRACE;
      assert.isTrue(logger.areAllEnabled());

      logger.level = LogLevel.ALL;
      assert.isTrue(logger.areAllEnabled());
    });
  });

  describe("fatal", () => {
    it("logs nothing when logger.level is below LogLevel.FATAL", () => {
      logger.level = LogLevel.OFF;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.FATAL", () => {
      logger.level = LogLevel.FATAL;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ERROR;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.WARN;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.INFO;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.DEBUG;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.TRACE;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.fatal(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("error", () => {
    it("returns false when logger.level is below LogLevel.ERROR", () => {
      logger.level = LogLevel.OFF;
      logger.error(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.FATAL;
      logger.error(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.ERROR", () => {
      logger.level = LogLevel.ERROR;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.WARN;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.INFO;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.DEBUG;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.TRACE;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.error(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("warn", () => {
    it("returns false when logger.level is below LogLevel.WARN", () => {
      logger.level = LogLevel.OFF;
      logger.warn(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.FATAL;
      logger.warn(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.ERROR;
      logger.warn(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.WARN", () => {
      logger.level = LogLevel.WARN;
      logger.warn(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.INFO;
      logger.warn(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.DEBUG;
      logger.warn(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.TRACE;
      logger.warn(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.warn(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("info", () => {
    it("returns false when logger.level is below LogLevel.INFO", () => {
      logger.level = LogLevel.OFF;
      logger.info(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.FATAL;
      logger.info(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.ERROR;
      logger.info(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.WARN;
      logger.info(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.INFO", () => {
      logger.level = LogLevel.INFO;
      logger.info(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.DEBUG;
      logger.info(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.TRACE;
      logger.info(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.info(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("debug", () => {
    it("returns false when logger.level is below LogLevel.DEBUG", () => {
      logger.level = LogLevel.OFF;
      logger.debug(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.FATAL;
      logger.debug(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.ERROR;
      logger.debug(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.WARN;
      logger.debug(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.INFO;
      logger.debug(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.DEBUG", () => {
      logger.level = LogLevel.DEBUG;
      logger.debug(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.TRACE;
      logger.debug(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.debug(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });

  describe("trace", () => {
    it("returns false when logger.level is below LogLevel.TRACE", () => {
      logger.level = LogLevel.OFF;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.FATAL;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.ERROR;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.WARN;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.INFO;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);

      logger.level = LogLevel.DEBUG;
      logger.trace(LOG_CONTEXT, "message");
      assert.isFalse(logger.printFormat.called);
    });

    it("returns true when logger.level is at least LogLevel.TRACE", () => {
      logger.level = LogLevel.TRACE;
      logger.trace(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);

      logger.level = LogLevel.ALL;
      logger.trace(LOG_CONTEXT, "message");
      assert.isTrue(logger.printFormat.called);
    });
  });
});
