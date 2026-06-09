// 服务启动入口
import 'dotenv/config';
import { createApp } from './app.js';
import './db.js'; // 引入即完成数据库初始化

const PORT = Number(process.env.PORT ?? 3001);

const app = createApp();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
