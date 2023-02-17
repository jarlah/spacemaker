import { RDSDataService } from "aws-sdk";
import { Kysely, sql } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";
import Ajv from "ajv";
import { APIGatewayEvent } from "aws-lambda";

const ajv = new Ajv();

interface Database {
  tblcounter: {
    counter: string;
    tally: number;
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
    .createTable("tblcounter")
    .addColumn("counter", "text", (col) => col.primaryKey())
    .addColumn("tally", "integer")
    .ifNotExists()
    .execute();

  await db
    .insertInto("tblcounter")
    .values({
      counter: "hits",
      tally: 0,
    })
    .onConflict((oc) => oc.column("counter").doNothing())
    .execute();
}

const iceCreamSchema = {
  type: "object",
  properties: {
    flavour: { type: "string" },
    price: { type: "number" },
    stock: { type: "number" },
  },
  required: ["flavour", "price", "stock"],
};

export async function handler(event: APIGatewayEvent) {
  // Validate payload
  const data = JSON.parse(event.body || "{}");
  const isDataValid = ajv.validate(iceCreamSchema, data);
  if (!isDataValid) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ajv.errors),
    };
  }

  // FIXME this is a costly operation, that takes two sql operations,
  // but for now it will have to suffice
  await initializeDatabase(db);

  const record = await db
    .selectFrom("tblcounter")
    .select("tally")
    .where("counter", "=", "hits")
    .executeTakeFirstOrThrow();

  let count = record.tally;

  await db
    .updateTable("tblcounter")
    .set({
      tally: ++count,
    })
    .execute();

  return {
    statusCode: 200,
    body: count,
  };
}
