# Core (services)

Consider using services folder instead of placing all logic in core.

Right now this contains all logic that needs to be tested separately from lambda handlers

## Start postgis in docker for running tests locally 

`docker run --name some-postgis -p 2345:5432 -e POSTGRES_PASSWORD=postgres -d postgis/postgis`