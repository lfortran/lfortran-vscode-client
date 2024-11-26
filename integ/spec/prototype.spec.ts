import { assert } from "chai";

// import the webdriver and the high level browser wrapper
import {
  EditorView,
  Setting,
  SettingsEditor,
  TextEditor,
  VSBrowser,
  WebDriver,
  Workbench,
} from "vscode-extension-tester";

// Create a Mocha suite
describe("My Test Suite", () => {
  let browser: VSBrowser;
  let driver: WebDriver;
  let workbench: Workbench;

  // initialize the browser and webdriver
  before(async () => {
    browser = VSBrowser.instance;
    driver = browser.driver;
    workbench = new Workbench();
    const settingsEditor: SettingsEditor = await workbench.openSettings();
    // NOTE: The following two statements are equivalent:
    // ==================================================
    // 1. const lfortranPathSetting =
    //       await settingsEditor.findSetting("Lfortran Path", "LFortran Language Server", "Compiler");
    // 2. const lfortranPathSetting: Setting =
    //       await settingsEditor.findSettingByID("LFortranLanguageServer.compiler.lfortranPath");
    const lfortranPathSetting: Setting =
      await settingsEditor.findSettingByID("LFortranLanguageServer.compiler.lfortranPath");
    await lfortranPathSetting.setValue("/home/dylon/Workspace/lcompilers/lfortran/src/bin/lfortran");
    await new EditorView().closeAllEditors();
  });

  after(async () => {
    await new EditorView().closeAllEditors();
  });

  // test whatever we want using webdriver, here we are just checking the page title
  it("My Test Case", async () => {
    await browser.openResources("/home/dylon/Workspace/lcompilers/lfortran/tests/function_call1.f90");
    let editor: TextEditor = (await new EditorView().openEditor('function_call1.f90')) as TextEditor;
    await editor.typeTextAt(20, 33, '\nm');
    console.log(JSON.stringify(await editor.getCodeLenses()));
    await new Promise((res) => setTimeout(res, 5 * 60000));
  });
});
