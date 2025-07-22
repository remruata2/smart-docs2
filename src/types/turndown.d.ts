declare module 'turndown' {
  export default class TurndownService {
    constructor(options?: any);
    turndown(html: string): string;
    use(plugin: any): this;
    addRule(key: string, rule: any): this;
    keep(filter: string): this;
    remove(filter: string): this;
  }
}
