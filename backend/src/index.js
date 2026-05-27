import './env.js';
import { bootstrap } from "./app.controller.js";
import { connectMongo } from "./Database/mongo_connection.js";

/* Mongo is the sole datastore — connect before serving requests so we
   fail loudly on a misconfigured connection string rather than letting
   the first DB write blow up mid-request. */
await connectMongo();

const app = bootstrap();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
