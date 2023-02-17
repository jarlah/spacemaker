import { RDSDataService } from "aws-sdk";
import { Kysely, sql } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";
import Ajv from "ajv";
import { APIGatewayEvent } from "aws-lambda";
import schema from "./schema";
import { RootSchema } from "./types";

const ajv = new Ajv();

interface Database {
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

export async function createHandler(event: APIGatewayEvent) {
  // Parse json
  const data: RootSchema = JSON.parse(event.body || "{}");

  // Validate json
  if (!ajv.validate(schema, data)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ajv.errors),
    };
  }

  // "Migrate"
  // FIXME this is a costly operation, that takes multiple sql operations,
  // but for now it will have to suffice
  await initializeDatabase(db);

  // Validate geometry
  // Can use sql for this
  // 1. Merge height plateaus
  // 2. Check if the merged height_plateaus geometry completely covers the building limits geometry

  // Insert the new polygon project
  const newProjectId = createNewPolygonProject(db, data);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: newProjectId,
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

async function initializeDatabase(trx: Kysely<Database>): Promise<void> {
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

/**
 * Creates a project with building limits and height plateaus
 * 
 * @param trx the transaction
 * @param data the geojson data
 * @returns the new project id
 */
const createNewPolygonProject = (trx: Kysely<Database>, data: RootSchema): Promise<number> => {
  return db.transaction().execute(async (trx) => {
    const res = await trx
      .insertInto("projects")
      .values({ name: "Project" })
      .returning("id")
      .executeTakeFirst();
    const newProjectId = res?.id;
    if (!newProjectId)
      throw new Error("Missing result from project creation");

    const polygons = [
      ...data.building_limits.features.map((feat) => ({
        type: "building_limit",
        polygon: JSON.stringify(feat.geometry),
        project_id: newProjectId,
        elevation: undefined,
      })),
      ...data.height_plateaus.features.map((feat) => ({
        type: "height_plateau",
        polygon: JSON.stringify(feat.geometry),
        project_id: newProjectId,
        elevation: feat.properties.elevation,
      })),
    ];

    await trx
      .insertInto("polygons")
      .values(
        polygons.map((p) => ({
          ...p,
          polygon: sql`ST_GeomFromGeoJSON(${p.polygon} :: json)`,
        }))
      )
      .execute();

    return newProjectId;
  });
};
