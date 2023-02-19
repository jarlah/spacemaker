import { APIGatewayEvent } from "aws-lambda";
import { expect, test } from "vitest";
import { validateRequestBody } from "./jsonSchema";

test("lambda function with empty body returns validation error for missing building", async () => {
  const result = validateRequestBody("");
  expect(result).toEqual({
    success: false,
    data: [{"instancePath":"","schemaPath":"#/required","keyword":"required","params":{"missingProperty":"building_limits"},"message":"must have required property \'building_limits\'"}],
  });
});
