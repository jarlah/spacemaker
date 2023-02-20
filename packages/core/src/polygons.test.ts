import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import { expect, test } from "vitest";
import * as path from "path";
import { Pool } from "pg";
import { promises as fs } from "fs";
import Database from "./databaseType";
import {
  createPolygonProjectFromSchema,
  updatePolygonProjectFromSchema,
  validatePolygons,
} from "./polygons";
// @ts-ignore
import polygonsTestData from "./polygons.test.data.json";
import { fail } from "assert";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: "localhost",
      database: "postgres",
      user: "postgres",
      password: "postgres",
      port: 2345, // to avoid colliding with normal postgres
    }),
  }),
});

await runMigration(db);

test("createPolygonProjectFromSchema", async () => {
  const result = await createPolygonProjectFromSchema(db, polygonsTestData);

  const newProjectId = Number.parseInt(result.toString());

  expect(newProjectId).toBeGreaterThan(0);

  const polygons = await db
    .selectFrom("polygons")
    .where("project_id", "=", newProjectId)
    .execute();

  expect(polygons.length).toEqual(4);
});

test("validatePolygons", () => {
  expect(validatePolygons(db, polygonsTestData)).toEqual(true);
});

test("updatePolygonProjectFromSchema", async () => {
  const result = await createPolygonProjectFromSchema(db, polygonsTestData);
  expect(
    updatePolygonProjectFromSchema(db, result.toString(), polygonsTestData)
  ).not.toThrowError;
});

async function runMigration(db: Kysely<Database>) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: `${process.cwd()}/../../services/migrations`,
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    fail(JSON.stringify(error));
  }
}
