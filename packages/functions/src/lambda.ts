import { RDSDataService } from "aws-sdk";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";
import { APIGatewayEvent } from "aws-lambda";
import { validateRequestBody } from "@spacemaker/core/jsonSchema";
import Database from "@spacemaker/core/databaseType";
import {
  createPolygonProjectFromSchema,
  updatePolygonProjectFromSchema,
  validatePolygons,
} from "@spacemaker/core/polygons";
import {
  badRequest,
  created,
  handleErrors,
  internalServerError,
  ok,
  updated,
} from "@spacemaker/core/http";

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

// TODO, if i were to make more of these kinds of serverless apps,
// i would have found a better way to solve code reuse
// The following two lambdas is almost identical, except for one taking a parameter
// and both calling different service logic

export async function getHandler(_: APIGatewayEvent) {
  return ok("Not yet implemented");
}

export async function updateHandler(event: APIGatewayEvent) {
  // update handler takes an id path param, so force the type
  const projectId = event.pathParameters?.id as string;

  const result = validateRequestBody(event.body);
  if (!result.success) {
    return badRequest(result.data);
  }

  const valid = validatePolygons(db, result.data);
  if (!valid) {
    return badRequest(
      "Invalid building limits and/or overlapping height plateaus"
    );
  }

  const saveResult = await handleErrors(
    updatePolygonProjectFromSchema(db, projectId, result.data)
  );

  switch (saveResult.success) {
    case true:
      return updated();
    case false:
      return internalServerError(saveResult.data?.toString());
  }
}

export async function createHandler(event: APIGatewayEvent) {
  const result = validateRequestBody(event.body);
  if (!result.success) {
    return badRequest(result.data);
  }

  const valid = validatePolygons(db, result.data);
  if (!valid) {
    return badRequest(
      "Invalid building limits and/or overlapping height plateaus"
    );
  }

  const saveResult = await handleErrors(
    createPolygonProjectFromSchema(db, result.data)
  );

  switch (saveResult.success) {
    case true:
      return created(saveResult.data?.toString());
    case false:
      return internalServerError(saveResult.data?.toString());
  }
}
