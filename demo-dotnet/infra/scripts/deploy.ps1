param(
    [string]$ResourceGroup = "rg-cloudmain-retail-demo",
    [string]$Location = "eastus",
    [string]$ParametersFile = "demo-dotnet/infra/parameters/dormant.parameters.json",
    [Parameter(Mandatory = $true)]
    [SecureString]$SyntheticKey
)

$ErrorActionPreference = "Stop"
$plainSyntheticKey = [System.Net.NetworkCredential]::new("", $SyntheticKey).Password

az group create --name $ResourceGroup --location $Location
az deployment group create `
    --name "cloudmain-$(Get-Date -Format yyyyMMddHHmmss)" `
    --resource-group $ResourceGroup `
    --template-file demo-dotnet/infra/main.bicep `
    --parameters "@$ParametersFile" `
    --parameters syntheticKey=$plainSyntheticKey
