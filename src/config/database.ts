import mongoose from "mongoose";

// Connects the application before the HTTP server starts accepting requests.
export async function connectToDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri);
}