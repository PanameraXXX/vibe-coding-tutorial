// better-sqlite3-session-store 没自带类型，简单声明工厂函数
declare module 'better-sqlite3-session-store' {
  import type session from 'express-session';
  import type Database from 'better-sqlite3';

  interface StoreOptions {
    client: Database.Database;
    expired?: {
      clear?: boolean;
      intervalMs?: number;
    };
  }

  function factory(s: typeof session): new (opts: StoreOptions) => session.Store;
  export = factory;
}
