import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis;`.execute(db);
  await db.schema
    .createTable("projects")
    .addColumn("id", "bigserial", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .ifNotExists()
    .execute();
  await db.schema
    .createTable("polygons")
    .addColumn("id", "bigserial", (col) => col.primaryKey())
    .addColumn("type", "varchar", (col) => col.notNull())
    .addColumn("polygon", sql`geometry`, (col) => col.notNull())
    .addColumn("elevation", sql`NUMERIC(10, 2)`)
    .addColumn("project_id", sql`bigserial`, (col) => col.notNull())
    .addForeignKeyConstraint(
      "polygon_belongs_to_project",
      ["project_id"],
      "projects",
      ["id"]
    )
    .ifNotExists()
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropTable("polygons").execute();
  await db.schema.dropTable("projects").execute();
}
