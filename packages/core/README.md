# Core (services)

Consider using services folder instead of placing all logic in core.

Right now this contains all logic that needs to be tested separately from lambda handlers

## Running tests locally

### Start postgis in docker

`docker run --name some-postgis -p 2345:5432 -e POSTGRES_PASSWORD=postgres -d postgis/postgis`

## Work in progress

I do not yet know how to validate height plateaus and building limits, or how to "split building limits" based on height plateaus. The problem description doesnt make sense, and i have tried as best as i can to make a foundation for a service that can act as a starting point for further development on the topic. Including tests.

### merge height plateau polygons?

```sql
SELECT project_id, ST_Union(ST_SnapToGrid(polygon,0.0001)) as geo 
FROM polygons
WHERE type = 'height_plateau'
GROUP BY project_id;
```