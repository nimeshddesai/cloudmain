# Multi-Region Retail Service Patch Safety Demo

## Purpose

This demo shows how production observability plus sliced rollout architecture reduces customer impact when a bad retail service patch is released.

The retail service exposes a simple checkout path:

```text
Catalog lookup -> Add to cart -> Purchase
```

The bad patch intentionally breaks only `Purchase`, while catalog and cart still work. This makes the failure realistic: the service is partially healthy, but the customer-critical checkout path is broken.

## Customer Starting Point: Regional Rollout

Many customers already run in multiple regions, but deploy one full region at a time. Metrics may exist at region level, yet detection often happens only after a large customer impact.

### Customer Runtime Flow

```mermaid
flowchart LR
    C["Clients"] --> AFD["Azure Front Door"]
    AFD --> EUS["East US service\n50% capacity"]
    AFD --> WUS["West US service\n50% capacity"]
    EUS --> DB["Purchase database"]
    WUS --> DB
```

### Deployment Flow

```mermaid
flowchart LR
    P["Patch pipeline"] --> EUS
    P -. "wait, then continue" .-> WUS
    EUS["East US service\n50% capacity"]
    WUS["West US service\n50% capacity"]
```

### Challenge

If the patch is deployed to East US first and breaks checkout:

```text
Impact target: 50% of production capacity
Detection: regional synthetic or customer failures
Rollback: after failure is detected
Risk: large blast radius before the pipeline stops
```

In the demo, the GitHub workflow is run as:

```text
rollout_mode = current
patch_version = v2-bad
```

Expected result:

```text
Deploy patch to East US
Checkout validation fails on Purchase
Rollback East US
Stop before West US
```

## Improved Setup: Sliced Production Rollout

We help re-architect production capacity into smaller slices while keeping the same total regional capacity. The first production deployment goes to a small slice, then expands only after checkout validation passes.

### Customer Runtime Flow

```mermaid
flowchart LR
    C["Clients"] --> AFD["Azure Front Door"]
    AFD --> E0["East US Ring 0\n5% capacity"]
    AFD --> E1["East US Ring 1\n45% capacity"]
    AFD --> W0["West US Ring 0\n5% capacity"]
    AFD --> W1["West US Ring 1\n45% capacity"]
    E0 --> DB["Purchase database"]
    E1 --> DB
    W0 --> DB
    W1 --> DB
```

### Deployment Flow

```mermaid
flowchart LR
    P["Patch pipeline"] --> E0
    P -. "only if healthy" .-> E1
    P -. "only if healthy" .-> W0
    P -. "only if healthy" .-> W1
    E0["East US Ring 0\n5% capacity"]
    E1["East US Ring 1\n45% capacity"]
    W0["West US Ring 0\n5% capacity"]
    W1["West US Ring 1\n45% capacity"]
```

### Improvement

If the same bad patch breaks checkout:

```text
Impact target: 5% of production capacity
Detection: targeted synthetic checkout validation
Rollback: only the failed slice
Risk: rollout stops before larger rings are exposed
```

In the demo, the GitHub workflow is run as:

```text
rollout_mode = sliced
patch_version = v2-bad
```

Expected result:

```text
Deploy patch to East US Ring 0
Checkout validation fails on Purchase
Rollback East US Ring 0
Stop before East US Ring 1 and West US
```

## Observability Loop

The demo uses synthetic transactions to validate the complete checkout path, not just service uptime.

```mermaid
flowchart LR
    W["Synthetic worker\nruns every 30 seconds"] --> AFD["Azure Front Door"]
    AFD --> SVC["Retail service target"]
    SVC --> DB["Purchase database"]
    W --> Store["Status history JSON\nAzure Storage"]
    Store --> Status["Public service status page\navailability bars"]
    GH["Retail Service Patch\nGitHub Actions"] --> AFD
    GH --> Rollback["Rollback failed target"]
```

The public status page shows customer-safe availability:

```text
Catalog
Cart
Checkout
East US
West US
```

It does not expose patch versions, rollback details, synthetic headers, or internal ring names.

## Demo Walkthrough

1. Open the public status page:

   ```text
   https://retail-retaildemo-bjg2ebhydwemckfr.z02.azurefd.net/
   ```

2. Run the current regional rollout:

   ```text
   Retail Service Patch
   rollout_mode = current
   patch_version = v2-bad
   ```

   Message: a bad patch can threaten a full 50% regional target.

3. Run the sliced rollout:

   ```text
   Retail Service Patch
   rollout_mode = sliced
   patch_version = v2-bad
   ```

   Message: the same failure is contained to the first 5% slice.

4. Show the pipeline language:

   ```text
   Build retail service patch image
   Deploy patch and validate checkout health
   Rollback failed rollout target
   Stop patch rollout before wider impact
   ```

## Key Takeaway

Multi-region alone reduces infrastructure risk, but it does not automatically reduce deployment blast radius. Sliced production rollout plus synthetic checkout validation changes the failure mode:

```text
From: detect after a large regional impact
To: detect in a small production slice and stop automatically
```
