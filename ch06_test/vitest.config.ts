import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 每个用例都用绿色 ✓ 显示出来，跑测试一眼能看到全绿
    reporters: ['verbose'],
    // 每个测试文件单独跑，避免共享内存 db
    isolate: true,
    pool: 'forks',
    // db.ts 顶层 new Database，必须在 import 前设置 DB_PATH
    // 单测里用 vi.resetModules() + 动态 import 控制
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    // 让源码里 `import './foo.js'` 能正确解析到 .ts 源文件
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
});
