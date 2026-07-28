# Azure architecture

The deployable retail observability environment is defined in `demo-dotnet/infra`.

## Runtime resources

- Azure Container Registry for the three application images.
- Log Analytics and workspace-based Application Insights.
- Storage for public and Service Rings status documents.
- Consumption Container Apps environments in East US and West US.
- Six retail API Container Apps, one status page, and one synthetic worker.
- Azure Front Door Standard with retail, simple, and status endpoints.

The retail endpoint uses East US and West US as the normal 50/50 origin group.
A Front Door rule set examines `x-target-slice` and overrides the origin group
for the four protected Service Ring targets. The application validates the
separate `x-synthetic-key` header.

## Resource ownership

`speech-retaildemo-video` is intentionally excluded. Repository and live-resource
inspection found no runtime dependency on Azure Speech. It is a separate Free
tier video experiment and should be moved or deleted independently.

The Application Insights Smart Detection action group is service-managed and is
not declared explicitly.
