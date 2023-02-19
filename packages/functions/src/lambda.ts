import { RDSDataService } from "aws-sdk";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";
import { APIGatewayEvent } from "aws-lambda";
import { validateRequestBody } from "@spacemaker/core/schema";
import { Database, initializeDatabase } from "@spacemaker/core/database";
import { createPolygonProjectFromSchema, validatePolygons} from '@spacemaker/core/polygons';

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

export async function updateHandler(event: APIGatewayEvent) {
  const projectId = event.pathParameters?.id;
  const result = validateRequestBody(event.body);
  if (!result.success) {
    return result.data;
  }

  // "Migrate"
  // FIXME this is a costly operation, that takes multiple sql operations,
  // but for now it will have to suffice
  await initializeDatabase(db);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectId),
  };
}

export async function createHandler(event: APIGatewayEvent) {
  const result = validateRequestBody(event.body);
  if (!result.success) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    }
  }

  // "Migrate"
  // FIXME this is a costly operation, that takes multiple sql operations,
  // but for now it will have to suffice
  await initializeDatabase(db);

  const valid = validatePolygons(result.data);
  if (!valid) {
    return {
      statusCode: 400,
      body: "Invalid building limits and/or overlapping height plateaus",
    };
  }

  // Insert the new polygon project
  const newProjectId = await createPolygonProjectFromSchema(db, result.data);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newProjectId),
  };
}
