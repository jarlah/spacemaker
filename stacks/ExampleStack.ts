import { Api, RDS, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the Aurora DB cluster
  const cluster = new RDS(stack, "Cluster", {
    engine: "postgresql11.13",
    defaultDatabaseName: "Spacemaker",
    migrations: "services/migrations",
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [cluster],
      },
    },
    routes: {
      "POST /": "packages/functions/src/lambda.createHandler",
      "PUT /{id}": "packages/functions/src/lambda.updateHandler",
      "GET /{id}": "packages/functions/src/lambda.getHandler",
    },
  });

  // Show the resource info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    SecretArn: cluster.secretArn,
    ClusterIdentifier: cluster.clusterIdentifier,
  });
}
