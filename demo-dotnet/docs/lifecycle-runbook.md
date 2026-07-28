# Azure lifecycle runbook

Run all commands from the repository root after `az login` and selecting the
intended subscription.

## Validate

```powershell
.\demo-dotnet\infra\scripts\validate.ps1 `
  -SyntheticKey (Read-Host "Synthetic key" -AsSecureString)
```

## Deploy dormant

Dormant is the default cost-safe state: retail and synthetic minimum replicas
are zero.

```powershell
.\demo-dotnet\infra\scripts\deploy.ps1 `
  -SyntheticKey (Read-Host "Synthetic key" -AsSecureString)
```

## Start and stop

```powershell
.\demo-dotnet\infra\scripts\start-demo.ps1
.\demo-dotnet\infra\scripts\stop-demo.ps1 -RemoveFrontDoor
```

Removing Front Door is the only way to stop its profile base fee. A later Bicep
deployment recreates it.

## Destroy

```powershell
.\demo-dotnet\infra\scripts\destroy.ps1 `
  -ConfirmResourceGroup "rg-cloudmain-retail-demo"
```

Resource-group deletion is irreversible. Validate a fresh deployment in a
temporary resource group before deleting the last working environment.
