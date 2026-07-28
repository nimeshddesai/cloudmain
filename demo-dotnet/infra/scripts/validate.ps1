param(
    [string]$ResourceGroup = "rg-cloudmain-retail-demo",
    [string]$ParametersFile = "demo-dotnet/infra/parameters/dormant.parameters.json",
    [Parameter(Mandatory = $true)]
    [SecureString]$SyntheticKey
)

$ErrorActionPreference = "Stop"
$plainSyntheticKey = [System.Net.NetworkCredential]::new("", $SyntheticKey).Password

az bicep build --file demo-dotnet/infra/main.bicep
az deployment group validate `
    --resource-group $ResourceGroup `
    --template-file demo-dotnet/infra/main.bicep `
    --parameters "@$ParametersFile" `
    --parameters syntheticKey=$plainSyntheticKey
