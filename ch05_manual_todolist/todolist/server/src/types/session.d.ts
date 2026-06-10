// 扩展 express-session 的 SessionData，加上 userId
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}
