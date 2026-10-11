import "dotenv/config";
import { app } from "./app";
import { connectToDatabase } from "./config/database";
//order is important here, need to connect to the database before starting the server
const port = Number(process.env.PORT ?? 3000);
const databaseUri = process.env.MONGODB_URI;

async function startServer(): Promise<void> {
  if (!databaseUri) {
    throw new Error("MONGODB_URI is missing from the .env file");
  }

  await connectToDatabase(databaseUri);

  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the API", error);
  process.exitCode = 1;
});