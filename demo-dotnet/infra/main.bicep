targetScope = 'resourceGroup'

@description('Short environment name used in resource names.')
param environmentName string = 'retaildemo'

@description('Azure region for East US service slices.')
param eastLocation string = 'eastus'

@description('Azure region for West US service slices.')
param westLocation string = 'westus'

@description('Container image for the retail service.')
param retailServiceImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container image for the status page.')
param statusPageImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container image for the periodic synthetic worker.')
param syntheticWorkerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Synthetic key that protected Front Door routing will pass to app code in a later phase.')
@secure()
param syntheticKey string

@description('Tags applied to all supported resources.')
param tags object = {
  workload: 'cloudmain-retail-observability-demo'
}

var safeName = toLower(replace(environmentName, '-', ''))
var logAnalyticsName = 'log-${safeName}'
var appInsightsName = 'appi-${safeName}'
var acrName = take('acr${safeName}${uniqueString(resourceGroup().id)}', 50)
var storageAccountName = take('st${safeName}${uniqueString(resourceGroup().id)}', 24)
var eastEnvName = 'cae-${safeName}-eastus'
var westEnvName = 'cae-${safeName}-westus'
var frontDoorProfileName = 'afd-${safeName}'
var frontDoorEndpointName = 'retail-${safeName}'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: eastLocation
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: eastLocation
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: eastLocation
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource statusStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: eastLocation
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

var statusStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${statusStorage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${statusStorage.listKeys().keys[0].value}'

resource eastEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: eastEnvName
  location: eastLocation
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource westEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: westEnvName
  location: westLocation
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource currentEastApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-cur-eus'
  location: eastLocation
  tags: union(tags, {
    demoMode: 'current'
    region: 'eastus'
    slice: 'eastus'
    capacityPercent: '50'
  })
  properties: {
    managedEnvironmentId: eastEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'eastus', 'eastus', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource currentWestApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-cur-wus'
  location: westLocation
  tags: union(tags, {
    demoMode: 'current'
    region: 'westus'
    slice: 'westus'
    capacityPercent: '50'
  })
  properties: {
    managedEnvironmentId: westEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'westus', 'westus', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource slicedEastRing0App 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-sl-eus-r0'
  location: eastLocation
  tags: union(tags, {
    demoMode: 'sliced'
    region: 'eastus'
    slice: 'eastus-ring0'
    capacityPercent: '5'
  })
  properties: {
    managedEnvironmentId: eastEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'eastus', 'eastus-ring0', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource slicedEastRing1App 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-sl-eus-r1'
  location: eastLocation
  tags: union(tags, {
    demoMode: 'sliced'
    region: 'eastus'
    slice: 'eastus-ring1'
    capacityPercent: '45'
  })
  properties: {
    managedEnvironmentId: eastEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'eastus', 'eastus-ring1', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource slicedWestRing0App 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-sl-wus-r0'
  location: westLocation
  tags: union(tags, {
    demoMode: 'sliced'
    region: 'westus'
    slice: 'westus-ring0'
    capacityPercent: '5'
  })
  properties: {
    managedEnvironmentId: westEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'westus', 'westus-ring0', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource slicedWestRing1App 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-sl-wus-r1'
  location: westLocation
  tags: union(tags, {
    demoMode: 'sliced'
    region: 'westus'
    slice: 'westus-ring1'
    capacityPercent: '45'
  })
  properties: {
    managedEnvironmentId: westEnvironment.id
    configuration: containerAppConfiguration(syntheticKey, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: containerAppTemplate(retailServiceImage, 'westus', 'westus-ring1', 'v1', appInsights.properties.ConnectionString, syntheticKey)
  }
}

resource statusPageApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-status'
  location: eastLocation
  tags: union(tags, {
    demoMode: 'status'
  })
  properties: {
    managedEnvironmentId: eastEnvironment.id
    configuration: statusPageConfiguration(syntheticKey, statusStorageConnectionString, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: {
      containers: [
        {
          name: 'status-page'
          image: statusPageImage
          env: [
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'StatusStorage__ConnectionString'
              secretRef: 'status-storage-connection'
            }
            {
              name: 'StatusStorage__Container'
              value: 'status'
            }
            {
              name: 'StatusStorage__Blob'
              value: 'public-status.json'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

resource syntheticWorkerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${safeName}-synthetic'
  location: eastLocation
  tags: union(tags, {
    demoMode: 'synthetic'
  })
  properties: {
    managedEnvironmentId: eastEnvironment.id
    configuration: syntheticWorkerConfiguration(syntheticKey, statusStorageConnectionString, acr.properties.loginServer, acr.listCredentials().username, acr.listCredentials().passwords[0].value)
    template: {
      containers: [
        {
          name: 'synthetic-worker'
          image: syntheticWorkerImage
          env: [
            {
              name: 'FRONT_DOOR_URL'
              value: 'https://${frontDoorEndpoint.properties.hostName}'
            }
            {
              name: 'SYNTHETIC_KEY'
              secretRef: 'synthetic-key'
            }
            {
              name: 'STATUS_STORAGE_CONNECTION_STRING'
              secretRef: 'status-storage-connection'
            }
            {
              name: 'STATUS_CONTAINER'
              value: 'status'
            }
            {
              name: 'PUBLIC_STATUS_BLOB'
              value: 'public-status.json'
            }
            {
              name: 'SERVICE_RINGS_STATUS_BLOB'
              value: 'service-rings-status.json'
            }
            {
              name: 'CHECK_INTERVAL_SECONDS'
              value: '30'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: frontDoorProfileName
  location: 'global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: frontDoorProfile
  name: frontDoorEndpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

// Front Door origin groups, origins, routes, and protected synthetic header rules
// will be expanded after the first Azure deployment confirms generated Container App FQDNs.

func containerAppConfiguration(key string, registryServer string, registryUsername string, registryPassword string) object => {
  activeRevisionsMode: 'Single'
  ingress: {
    external: true
    targetPort: 8080
    transport: 'auto'
    allowInsecure: false
  }
  secrets: [
    {
      name: 'synthetic-key'
      value: key
    }
    {
      name: 'acr-password'
      value: registryPassword
    }
  ]
  registries: [
    {
      server: registryServer
      username: registryUsername
      passwordSecretRef: 'acr-password'
    }
  ]
}

func statusPageConfiguration(key string, statusConnectionString string, registryServer string, registryUsername string, registryPassword string) object => {
  activeRevisionsMode: 'Single'
  ingress: {
    external: true
    targetPort: 8080
    transport: 'auto'
    allowInsecure: false
  }
  secrets: [
    {
      name: 'synthetic-key'
      value: key
    }
    {
      name: 'status-storage-connection'
      value: statusConnectionString
    }
    {
      name: 'acr-password'
      value: registryPassword
    }
  ]
  registries: [
    {
      server: registryServer
      username: registryUsername
      passwordSecretRef: 'acr-password'
    }
  ]
}

func syntheticWorkerConfiguration(key string, statusConnectionString string, registryServer string, registryUsername string, registryPassword string) object => {
  activeRevisionsMode: 'Single'
  secrets: [
    {
      name: 'synthetic-key'
      value: key
    }
    {
      name: 'status-storage-connection'
      value: statusConnectionString
    }
    {
      name: 'acr-password'
      value: registryPassword
    }
  ]
  registries: [
    {
      server: registryServer
      username: registryUsername
      passwordSecretRef: 'acr-password'
    }
  ]
}

func containerAppTemplate(image string, region string, slice string, version string, appInsightsConnectionString string, key string) object => {
  containers: [
    {
      name: 'retail-service'
      image: image
      env: [
        {
          name: 'Demo__Region'
          value: region
        }
        {
          name: 'Demo__Slice'
          value: slice
        }
        {
          name: 'Demo__Version'
          value: version
        }
        {
          name: 'Demo__SyntheticKey'
          secretRef: 'synthetic-key'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
      ]
      resources: {
        cpu: json('0.25')
        memory: '0.5Gi'
      }
    }
  ]
  scale: {
    minReplicas: 1
    maxReplicas: 1
  }
}

output acrLoginServer string = acr.properties.loginServer
output statusStorageAccountName string = statusStorage.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output frontDoorEndpointHostName string = frontDoorEndpoint.properties.hostName
output currentEastFqdn string = currentEastApp.properties.configuration.ingress.fqdn
output currentWestFqdn string = currentWestApp.properties.configuration.ingress.fqdn
output slicedEastRing0Fqdn string = slicedEastRing0App.properties.configuration.ingress.fqdn
output slicedEastRing1Fqdn string = slicedEastRing1App.properties.configuration.ingress.fqdn
output slicedWestRing0Fqdn string = slicedWestRing0App.properties.configuration.ingress.fqdn
output slicedWestRing1Fqdn string = slicedWestRing1App.properties.configuration.ingress.fqdn
output statusPageFqdn string = statusPageApp.properties.configuration.ingress.fqdn
output syntheticWorkerName string = syntheticWorkerApp.name
