import { createApp } from './app';
import { openDatabase } from './db/connection';

// 服务端口（默认 3001，可通过环境变量覆盖）
const port = Number(process.env.PORT ?? 3001);
const db = openDatabase();
const app = createApp(db);

app.listen(port, () => {
  console.log(`[server] http://localhost:${port}`);
});
