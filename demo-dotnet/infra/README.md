# Azure Infrastructure

This folder contains the complete Bicep infrastructure and lifecycle scripts for
the .NET retail observability environment.

## Scope

The template prepares:

- Azure Container Registry Basic
- Log Analytics workspace
- Application Insights
- Azure Container Apps environments in East US and West US
- Container Apps for the current deployment model
- Container Apps for the ServiceRings deployment model
- Container App for the status page
- Azure Front Door Standard profile
- Retail, simple, and status endpoints
- Current, status, and Service Ring origin groups and origins
- Header-directed Service Ring routing rules

## Current topology

```text
East US 50%
West US 50%
```

## ServiceRings topology

```text
East US Ring0 5%
East US Ring1 45%
West US Ring0 5%
West US Ring1 45%
```

## Deployment

Install Azure CLI before using these commands:

```powershell
az version
az login
```

Create a resource group:

```powershell
az group create `
  --name rg-cloudmain-retail-demo `
  --location eastus
```

Validate the template:

```powershell
az deployment group validate `
  --resource-group rg-cloudmain-retail-demo `
  --template-file demo-dotnet/infra/main.bicep `
  --parameters @demo-dotnet/infra/dev.parameters.json
```

Deploy:

```powershell
az deployment group create `
  --resource-group rg-cloudmain-retail-demo `
  --template-file demo-dotnet/infra/main.bicep `
  --parameters @demo-dotnet/infra/dev.parameters.json
```

## Phase 8 first deployment

Phase 8 deploys the first Azure topology and uses images published to Azure Container Registry.

Login first:

```powershell
az login
az account show
```

If you have more than one subscription:

```powershell
az account set --subscription "<subscription-id-or-name>"
```

Create the resource group:

```powershell
az group create `
  --name rg-cloudmain-retail-demo `
  --location eastus
```

Validate:

```powershell
az deployment group validate `
  --resource-group rg-cloudmain-retail-demo `
  --template-file demo-dotnet/infra/main.bicep `
  --parameters @demo-dotnet/infra/phase8-first-deploy.parameters.json
```

Deploy:

```powershell
az deployment group create `
  --resource-group rg-cloudmain-retail-demo `
  --template-file demo-dotnet/infra/main.bicep `
  --parameters @demo-dotnet/infra/phase8-first-deploy.parameters.json
```

## Operating modes

Use `parameters/dormant.parameters.json` for the default cost-safe deployment.
It sets retail and synthetic minimum replicas to zero.

Use `parameters/demo.parameters.json` for a live demo with one replica per
retail target and the synthetic worker enabled.

The lifecycle scripts under `scripts/` validate, deploy, start, stop, and destroy
the environment. `stop-demo.ps1 -RemoveFrontDoor` removes the Front Door profile
because disabling an endpoint does not eliminate the profile base fee.

`phase8-first-deploy.parameters.json` is retained as historical deployment
context. New deployments should use the parameter files under `parameters/`.

The unrelated Free tier `speech-retaildemo-video` resource is intentionally
excluded. See `../docs/azure-architecture.md`.

## GitHub Actions rollout pipeline

The real retail service patch pipeline is defined in:

```text
.github/workflows/retail-demo-rollout.yml
```

It is manually started from GitHub Actions and performs:

- Build and push the retail service image to Azure Container Registry.
- Deploy the patch to either the ServiceRings or current topology.
- Run synthetic checkout through Azure Front Door after each target.
- Stop and run a separate rollback task for the failed target if checkout validation fails.

Required GitHub secrets:

```text
AZURE_CLIENT_ID=d8284dd4-1c44-47e0-a260-3f3cba04d3a7
AZURE_TENANT_ID=f403cee1-ccfb-4c1a-adc0-fefb2bea00a8
AZURE_SUBSCRIPTION_ID=9b11704c-1b3b-4688-94b0-805459ccf099
SYNTHETIC_KEY
```

Required GitHub environment variables:

```text
AZURE_RESOURCE_GROUP
AZURE_ACR_NAME
AZURE_ACR_LOGIN_SERVER
AZURE_FRONT_DOOR_URL
```

Populate these from the outputs of `main.bicep`; do not hard-code generated
resource names or hostnames in the workflow.

The Azure federated credential trusts:

```text
repo:sanjayraghani/cloudmain:environment:retail-demo
```

The workflow uses the `retail-demo` GitHub environment for the deployment job. Create that environment before running the workflow. Add required reviewers if you want manual approval before rollout begins.

For a failure walkthrough, run the workflow with:

```text
rollout_mode: service-rings
patch: Patch 2
```

Expected result:

```text
eastus-ring0 deploys Patch 2
GetItem passes
AddItemToCart passes
PurchaseItem fails
Rollback failed rollout target runs
patch rollout stops before eastus-ring1
```
