import { LanguageEngine } from './common';

export default class TypescriptEngine implements LanguageEngine {
  create = () => Promise.resolve();
}
