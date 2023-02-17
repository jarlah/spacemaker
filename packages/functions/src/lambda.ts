import { RDSDataService } from "aws-sdk";
import { Kysely, sql } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";
import Ajv from "ajv";
import { APIGatewayEvent } from "aws-lambda";
import schema from "./schema";

const ajv = new Ajv();

interface Database {
  polygons: {
    // Making it simple for now, and using bigserial instead of uuid
    id?: number;
    building_limits: string;
    height_plateaus: string;
    split_limits: string;
  };
}

const db = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: "postgres",
    driver: {
      // @ts-ignore RDS is just a simple typescript interface
      database: RDS.Cluster.defaultDatabaseName,
      // @ts-ignore RDS is just a simple typescript interface
      secretArn: RDS.Cluster.secretArn,
      // @ts-ignore RDS is just a simple typescript interface
      resourceArn: RDS.Cluster.clusterArn,
      client: new RDSDataService(),
    },
  }),
});

// Create the database and insert the counter if it doesnt exist
// Due to problems with migration not working, we are doing the "migration" here
// TODO in a real production environment, this is never an option
async function initializeDatabase(db: Kysely<Database>) {
  await sql<void>`CREATE EXTENSION IF NOT EXISTS postgis;`.execute(db);
  await db.schema
    .createTable("polygons")
    .addColumn("id", "bigserial", (col) => col.primaryKey())
    .addColumn("building_limits", "jsonb", (col) => col.notNull())
    .addColumn("height_plateaus", "jsonb", (col) => col.notNull())
    .addColumn("split_limits", "jsonb", (col) => col.notNull())
    .ifNotExists()
    .execute();
}

export async function createHandler(event: APIGatewayEvent) {
  // Parse json
  const data = JSON.parse(event.body || "{}");

  // Validate json
  if (!ajv.validate(schema, data)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ajv.errors),
    };
  }

  // Validate geometry
  // Can use sql for this
  // 1. Merge height plateaus
  // 2. Check if merged height_plateaus completely covers the building limits
  const sqltest = `
    SELECT
      row_number() OVER () AS gid,
      ST_AsText(ST_GeomFromGeoJSON(feat->>'geometry')) AS geom,
      feat->'properties' AS properties
    FROM (
      SELECT json_array_elements((height_plateaus->'features') :: json) AS feat
      FROM polygons
    ) AS f;
  `

  // "Migrate"
  // FIXME this is a costly operation, that takes two sql operations,
  // but for now it will have to suffice
  await initializeDatabase(db);

  // TODO figure out how to make split building limits
  const split_limits = data.building_limits

  // Insert
  const result = await db
    .insertInto("polygons")
    .values({
      building_limits: sql`${JSON.stringify(data.building_limits)}::jsonb`,
      height_plateaus: sql`${JSON.stringify(data.height_plateaus)}::jsonb`,
      split_limits: sql`${JSON.stringify(split_limits)}::jsonb`,
    })
    .returning("id")
    .executeTakeFirst();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: result?.id,
  };
}
