import { LanguageEngine } from './common';

export default class JavascriptEngine implements LanguageEngine {
  private suiteName: string = 'foo';
  describeBlock = `describe(${this.suiteName}, () => {});`;
  createFileContents = () => Promise.resolve(this.describeBlock);
}
