import { Kysely, sql } from "kysely";
import Database from "./databaseType";
import { RootSchema } from "./jsonSchemaTypes";

export const updatePolygonProjectFromSchema = async (
  db: Kysely<Database>,
  id: string,
  data: RootSchema
): Promise<void> => {
  // TODO
  // 1. Fetch project
  // 2. If project doesnt exist raise an Error("Project does not exist") which will resolve to 500 with that message
  // 3. If project exists, delete all polygons, and replace with polygons in incoming data object
  // 4. Use serializable transaction isolation level for the delete/insert operation above
};

/**
 * Creates a project with building limits and height plateaus
 *
 * @param trx the transaction
 * @param data the geojson data
 * @returns the new project id
 */
export const createPolygonProjectFromSchema = (
  db: Kysely<Database>,
  data: RootSchema
): Promise<number> => {
  return db.transaction().execute(async (trx) => {
    const res = await trx
      .insertInto("projects")
      .values({ name: "Project" })
      .returning("id")
      .executeTakeFirst();
    const newProjectId = res?.id;
    if (!newProjectId) throw new Error("Missing result from project creation");

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

// Validate geometry
// Can use sql for this
// 1. Merge height plateaus
// 2. Check if the merged height_plateaus geometry completely covers the building limits geometry
export function validatePolygons(db: Kysely<Database>, data: RootSchema): boolean {
  // TODO implement logic to validate polygons with postgis functions?
  return true;
}
