param(
    [string]$ResourceGroup = "rg-cloudmain-retail-demo",
    [Parameter(Mandatory = $true)]
    [string]$ConfirmResourceGroup
)

$ErrorActionPreference = "Stop"
if ($ConfirmResourceGroup -ne $ResourceGroup) {
    throw "Confirmation must exactly match resource group '$ResourceGroup'."
}

az group delete --name $ResourceGroup --yes
