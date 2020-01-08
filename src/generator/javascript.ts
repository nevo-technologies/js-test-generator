import { LanguageEngine } from './common';

export default class JavascriptEngine implements LanguageEngine {
  create = () => Promise.resolve();
}
