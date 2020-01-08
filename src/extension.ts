import { commands, ExtensionContext } from 'vscode';
import { generateUnitTestCommand } from './generator';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export const activate = (context: ExtensionContext) => {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = commands.registerCommand(
    'unit-test-generator.generateUnitTest',
    generateUnitTestCommand
  );

  context.subscriptions.push(disposable);
};

// this method is called when your extension is deactivated
export const deactivate = () => {};
