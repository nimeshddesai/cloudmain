param([string]$ResourceGroup = "rg-cloudmain-retail-demo")

$ErrorActionPreference = "Stop"
$apps = @(
    "ca-retaildemo-cur-eus",
    "ca-retaildemo-cur-wus",
    "ca-retaildemo-sl-eus-r0",
    "ca-retaildemo-sl-eus-r1",
    "ca-retaildemo-sl-wus-r0",
    "ca-retaildemo-sl-wus-r1",
    "ca-retaildemo-synthetic"
)

foreach ($app in $apps) {
    az containerapp update --resource-group $ResourceGroup --name $app --min-replicas 1 --max-replicas 1
}

az containerapp start --resource-group $ResourceGroup --name "ca-retaildemo-synthetic"
