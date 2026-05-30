# CloudMain Retail Observability (.NET)

This folder contains the C#/.NET retail observability implementation.
It is separate from the existing Node/npm prototype in `demo/`.

## Current scope

The current local scope includes the first service and synthetic pieces:

- `RetailService`: ASP.NET Core service that will expose retail APIs.
- `SyntheticRunner`: console app that runs checkout synthetics.
- `DemoControl`: console app that will coordinate rollout scenarios.
- `StatusPage`: availability page for regional and ServiceRings views.
- `RetailService.Tests`: test project for service behavior and health gates.

## Target regions

The Azure deployment uses US regions:

- East US
- West US

Current setup:

- East US: 50%
- West US: 50%

ServiceRings setup:

- East US Ring0: 5%
- East US Ring1: 45%
- West US Ring0: 5%
- West US Ring1: 45%

## Prerequisite

Install the .NET SDK before building or running this demo locally.

```powershell
dotnet --info
```

Expected future commands:

```powershell
dotnet restore demo-dotnet/CloudMain.RetailDemo.sln
dotnet test demo-dotnet/CloudMain.RetailDemo.sln
dotnet run --project demo-dotnet/src/RetailService
```

## Retail service

The service exposes:

- `GET /items/{id}`
- `POST /cart/items`
- `POST /purchase`
- `GET /health`

`Demo:Version` controls the patch behavior:

- `Patch 1`: all APIs are healthy.
- `Patch 2`: `GetItem` and `AddItemToCart` work, but `PurchaseItem` fails.
- `Patch 3`: all APIs are healthy.

Run locally with the patch that contains the Purchase bug:

```powershell
$env:Demo__Version="Patch 2"
dotnet run --project demo-dotnet/src/RetailService
```

## Synthetic runner

The synthetic runner executes the checkout workflow:

```text
GetItem -> AddItemToCart -> PurchaseItem
```

Run against a local service:

```powershell
dotnet run --project demo-dotnet/src/SyntheticRunner -- --url http://localhost:5000
```

Run through Azure Front Door with protected ServiceRing targeting:

```powershell
dotnet run --project demo-dotnet/src/SyntheticRunner -- `
  --url https://retail-demo.example.com `
  --target-slice eastus-ring0 `
  --synthetic-key <secret>
```

The runner sends:

```text
x-target-slice: eastus-ring0
x-synthetic-key: <secret>
```

## Demo control

`DemoControl` coordinates rollout health gates. It calls the same checkout flow and stops on the first unhealthy target.

Current regional rollout:

```powershell
dotnet run --project demo-dotnet/src/DemoControl -- `
  current `
  --version "Patch 2" `
  --url https://retail-demo.example.com `
  --synthetic-key <secret>
```

ServiceRings rollout:

```powershell
dotnet run --project demo-dotnet/src/DemoControl -- `
  service-rings `
  --version "Patch 2" `
  --url https://retail-demo.example.com `
  --synthetic-key <secret>
```

Current mode validates:

```text
East US 50% -> West US 50%
```

ServiceRings mode validates:

```text
East US Ring0 5% -> East US Ring1 45% -> West US Ring0 5% -> West US Ring1 45%
```

The intended behavior is:

```text
Patch 2 fails PurchaseItem
health gate fails
rollback current target to v1
pipeline stops before the next target
```

## Status page

The status page shows customer and ServiceRings availability views:

- Current deployment: East US 50%, West US 50%
- ServiceRings deployment: East US Ring0/Ring1, West US Ring0/Ring1

Run locally:

```powershell
dotnet run --project demo-dotnet/src/StatusPage --urls http://localhost:5080
```

Open:

```text
http://localhost:5080
```

## Docker

Dockerfiles are provided for:

- `RetailService`
- `StatusPage`

Build the service image from the repository root:

```powershell
docker build `
  -f demo-dotnet/src/RetailService/Dockerfile `
  -t cloudmain-retail-service:local `
  .
```

Build the status page image:

```powershell
docker build `
  -f demo-dotnet/src/StatusPage/Dockerfile `
  -t cloudmain-status-page:local `
  .
```

Run both with Docker Compose:

```powershell
docker compose -f demo-dotnet/docker-compose.yml up --build
```

Local container ports:

```text
StatusPage:    http://localhost:5080
RetailService: http://localhost:5081
```
