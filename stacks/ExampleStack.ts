import { Api, RDS, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the Aurora DB cluster
  const cluster = new RDS(stack, "Cluster", {
    engine: "postgresql11.13",
    defaultDatabaseName: "CounterDB",
    // TODO enable this when migrations is fixed, I removed the services folder to not keep unused code.
    // migrations: "services/migrations",
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [cluster],
      },
    },
    routes: {
      "POST /": "packages/functions/src/lambda.handler",
    },
  });

  // Show the resource info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    SecretArn: cluster.secretArn,
    ClusterIdentifier: cluster.clusterIdentifier,
  });
}
