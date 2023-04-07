
import Database from "tauri-plugin-sql-api";

const dbName = "test.db";
const db = await Database.load(`sqlite:${dbName}`);

await db.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");
