import { RDSDataService } from "aws-sdk";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDS } from "@serverless-stack/node/rds";

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

export async function handler() {
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
