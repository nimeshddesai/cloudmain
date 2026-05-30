# Azure Infrastructure

This folder contains Bicep infrastructure for the .NET retail observability demo.

## Scope

The template prepares:

- Azure Container Registry Basic
- Log Analytics workspace
- Application Insights
- Azure Container Apps environments in East US and West US
- Container Apps for the current deployment model
- Container Apps for the sliced deployment model
- Container App for the status page
- Azure Front Door Standard profile and endpoint scaffold

## Current topology

```text
East US 50%
West US 50%
```

## Sliced topology

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

## Notes

`phase8-first-deploy.parameters.json` is subscription/resource-group specific because it references the ACR login server created during the first deployment.

Front Door origin groups, origins, routes, and protected synthetic routing rules are intentionally staged after the first Container Apps deployment because the generated Container App FQDNs should be confirmed first.

## GitHub Actions rollout pipeline

The real retail service patch pipeline is defined in:

```text
.github/workflows/retail-demo-rollout.yml
```

It is manually started from GitHub Actions and performs:

- Build and push the retail service image to Azure Container Registry.
- Deploy the patch to either the sliced or current topology.
- Run synthetic checkout through Azure Front Door after each target.
- Stop and run a separate rollback task for the failed target if checkout validation fails.

Required GitHub secrets:

```text
AZURE_CLIENT_ID=d8284dd4-1c44-47e0-a260-3f3cba04d3a7
AZURE_TENANT_ID=f403cee1-ccfb-4c1a-adc0-fefb2bea00a8
AZURE_SUBSCRIPTION_ID=9b11704c-1b3b-4688-94b0-805459ccf099
SYNTHETIC_KEY
```

The Azure federated credential trusts:

```text
repo:sanjayraghani/cloudmain:environment:retail-demo
```

The workflow uses the `retail-demo` GitHub environment for the deployment job. Create that environment before running the workflow. Add required reviewers if you want manual approval before rollout begins.

For the failure demo, run the workflow with:

```text
rollout_mode: sliced
patch_version: v2-bad
```

Expected result:

```text
eastus-ring0 deploys v2-bad
GetItem passes
AddItemToCart passes
PurchaseItem fails
Rollback failed rollout target runs
patch rollout stops before eastus-ring1
```
