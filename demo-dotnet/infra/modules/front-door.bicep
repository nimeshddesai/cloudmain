@description('Short, normalized environment name used in resource names.')
param safeName string

@description('Tags applied to Front Door resources.')
param tags object

@description('FQDNs for the deployed Container Apps.')
param origins object

var profileName = 'afd-${safeName}'

resource profile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: profileName
  location: 'global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource retailEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: profile
  name: 'retail-${safeName}'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource simpleEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: profile
  name: 'simple-${safeName}'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource statusEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: profile
  name: 'status-${safeName}'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource currentOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-current'
  properties: originGroupProperties('/health')
}

resource currentEastOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: currentOriginGroup
  name: 'current-eastus'
  properties: originProperties(origins.currentEast, 500)
}

resource currentWestOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: currentOriginGroup
  name: 'current-westus'
  properties: originProperties(origins.currentWest, 500)
}

resource statusOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-status'
  properties: originGroupProperties('/')
}

resource statusOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: statusOriginGroup
  name: 'status'
  properties: originProperties(origins.status, 1000)
}

resource eastRing0OriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-sliced-eastus-ring0'
  properties: originGroupProperties('/health')
}

resource eastRing0Origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: eastRing0OriginGroup
  name: 'eastus-ring0'
  properties: originProperties(origins.eastRing0, 1000)
}

resource eastRing1OriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-sliced-eastus-ring1'
  properties: originGroupProperties('/health')
}

resource eastRing1Origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: eastRing1OriginGroup
  name: 'eastus-ring1'
  properties: originProperties(origins.eastRing1, 1000)
}

resource westRing0OriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-sliced-westus-ring0'
  properties: originGroupProperties('/health')
}

resource westRing0Origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: westRing0OriginGroup
  name: 'westus-ring0'
  properties: originProperties(origins.westRing0, 1000)
}

resource westRing1OriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'og-sliced-westus-ring1'
  properties: originGroupProperties('/health')
}

resource westRing1Origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: westRing1OriginGroup
  name: 'westus-ring1'
  properties: originProperties(origins.westRing1, 1000)
}

resource serviceRingRules 'Microsoft.Cdn/profiles/ruleSets@2024-02-01' = {
  parent: profile
  name: 'service-ring-routing'
}

resource eastRing0Rule 'Microsoft.Cdn/profiles/ruleSets/rules@2024-02-01' = {
  parent: serviceRingRules
  name: 'eastus-ring0'
  properties: sliceRuleProperties('eastus-ring0', eastRing0OriginGroup.id, 1)
}

resource eastRing1Rule 'Microsoft.Cdn/profiles/ruleSets/rules@2024-02-01' = {
  parent: serviceRingRules
  name: 'eastus-ring1'
  properties: sliceRuleProperties('eastus-ring1', eastRing1OriginGroup.id, 2)
}

resource westRing0Rule 'Microsoft.Cdn/profiles/ruleSets/rules@2024-02-01' = {
  parent: serviceRingRules
  name: 'westus-ring0'
  properties: sliceRuleProperties('westus-ring0', westRing0OriginGroup.id, 3)
}

resource westRing1Rule 'Microsoft.Cdn/profiles/ruleSets/rules@2024-02-01' = {
  parent: serviceRingRules
  name: 'westus-ring1'
  properties: sliceRuleProperties('westus-ring1', westRing1OriginGroup.id, 4)
}

resource retailRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: retailEndpoint
  name: 'retail'
  properties: {
    originGroup: {
      id: currentOriginGroup.id
    }
    ruleSets: [
      {
        id: serviceRingRules.id
      }
    ]
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

resource simpleRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: simpleEndpoint
  name: 'simple'
  properties: statusRouteProperties(statusOriginGroup.id)
}

resource statusRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: statusEndpoint
  name: 'status'
  properties: statusRouteProperties(statusOriginGroup.id)
}

func originGroupProperties(probePath string) object => {
  healthProbeSettings: {
    probeIntervalInSeconds: 30
    probePath: probePath
    probeProtocol: 'Https'
    probeRequestType: 'GET'
  }
  loadBalancingSettings: {
    additionalLatencyInMilliseconds: 0
    sampleSize: 4
    successfulSamplesRequired: 3
  }
  sessionAffinityState: 'Disabled'
}

func originProperties(hostName string, weight int) object => {
  enabledState: 'Enabled'
  enforceCertificateNameCheck: true
  hostName: hostName
  httpPort: 80
  httpsPort: 443
  originHostHeader: hostName
  priority: 1
  weight: weight
}

func sliceRuleProperties(slice string, originGroupId string, order int) object => {
  order: order
  conditions: [
    {
      name: 'RequestHeader'
      parameters: {
        operator: 'Equal'
        negateCondition: false
        matchValues: [
          slice
        ]
        selector: 'x-target-slice'
        transforms: [
          'Lowercase'
        ]
        typeName: 'DeliveryRuleRequestHeaderConditionParameters'
      }
    }
  ]
  actions: [
    {
      name: 'OriginGroupOverride'
      parameters: {
        originGroup: {
          id: originGroupId
        }
        typeName: 'DeliveryRuleOriginGroupOverrideActionParameters'
      }
    }
  ]
  matchProcessingBehavior: 'Stop'
}

func statusRouteProperties(originGroupId string) object => {
  originGroup: {
    id: originGroupId
  }
  ruleSets: []
  supportedProtocols: [
    'Http'
    'Https'
  ]
  patternsToMatch: [
    '/*'
  ]
  forwardingProtocol: 'HttpsOnly'
  linkToDefaultDomain: 'Enabled'
  httpsRedirect: 'Enabled'
  enabledState: 'Enabled'
}

output profileName string = profile.name
output retailEndpointHostName string = retailEndpoint.properties.hostName
output simpleEndpointHostName string = simpleEndpoint.properties.hostName
output statusEndpointHostName string = statusEndpoint.properties.hostName
