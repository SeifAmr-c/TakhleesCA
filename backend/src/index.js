import 'dotenv/config';
import { bootstrap } from "./app.controller.js";
import { connectMongo } from "./Database/mongo_connection.js";

/* Connect to MongoDB on boot but do not block server startup if Atlas
   is unreachable — MySQL remains the source of truth during migration. */
connectMongo().catch((err) => {
  console.error('[mongo] initial connect failed:', err.message);
});

/* Several legacy handlers still use the `db.query(..., (err, rows) => { if (err) throw err })`
   pattern. A throw inside that callback fires after Express's request lifecycle, so the
   central error middleware never sees it and Node would otherwise terminate the whole
   process — taking every unrelated request with it (including /user/logout). Log loudly
   instead of crashing so the server stays up while we migrate handlers. */
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const app = bootstrap();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));