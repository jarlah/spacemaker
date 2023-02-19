import { Kysely, sql } from "kysely";

export interface Database {
  polygons: {
    id?: number;
    type: string;
    polygon: any;
    elevation?: number;
    project_id: number;
  };
  projects: {
    id?: number;
    name: string;
  };
}

/**
 * Creates the necessary extensions and tables
 *
 * Due to problems with migration not working, we are doing the "migration" here
 *
 * TODO in a real production environment, we will need a proper migration
 *
 * @param trx the db
 */
export async function initializeDatabase(trx: Kysely<Database>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis;`.execute(trx);
  await trx.schema
    .createTable("projects")
    .addColumn("id", "bigserial", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .ifNotExists()
    .execute();
  await trx.schema
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
