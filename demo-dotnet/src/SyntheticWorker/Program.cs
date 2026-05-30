using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

var options = WorkerOptions.FromEnvironment();
using var client = new HttpClient
{
    BaseAddress = new Uri(options.FrontDoorUrl)
};

Console.WriteLine("CloudMain retail synthetic worker started.");
Console.WriteLine($"Front Door URL: {options.FrontDoorUrl}");
Console.WriteLine($"Interval seconds: {options.IntervalSeconds}");

while (true)
{
    try
    {
        var publicSnapshot = await RunPublicSnapshotAsync(client, options);
        await WriteSnapshotAsync(publicSnapshot, options, options.PublicBlobName);

        var serviceRingsSnapshot = await RunServiceRingsSnapshotAsync(client, options);
        await WriteSnapshotAsync(serviceRingsSnapshot, options, options.ServiceRingsBlobName);

        Console.WriteLine($"{publicSnapshot.GeneratedAtUtc:o} public={publicSnapshot.OverallStatus} serviceRings={serviceRingsSnapshot.OverallStatus}");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Synthetic worker cycle failed: {ex}");
    }

    await Task.Delay(TimeSpan.FromSeconds(options.IntervalSeconds));
}

static async Task<StatusSnapshot> RunPublicSnapshotAsync(HttpClient client, WorkerOptions options)
{
    var now = DateTimeOffset.UtcNow;
    var east = await RunRegionalCheckoutAsync(client, "eastus", "East US", options.SyntheticKey);
    var west = await RunRegionalCheckoutAsync(client, "westus", "West US", options.SyntheticKey);

    var previous = await ReadSnapshotAsync(options, options.PublicBlobName);
    var components = new[]
    {
        BuildComponent("catalog", "Catalog", now, StepStatus(east.GetItem) && StepStatus(west.GetItem), previous),
        BuildComponent("cart", "Cart", now, StepStatus(east.AddItemToCart) && StepStatus(west.AddItemToCart), previous),
        BuildComponent("checkout", "Checkout", now, StepStatus(east.PurchaseItem) && StepStatus(west.PurchaseItem), previous),
        BuildComponent("eastus", "East US", now, east.Healthy, previous),
        BuildComponent("westus", "West US", now, west.Healthy, previous)
    };

    var overall = components.All(component => component.Status == PublicStatus.Operational)
        ? PublicStatus.Operational
        : PublicStatus.Degraded;

    return new StatusSnapshot(
        now,
        options.IntervalSeconds,
        overall,
        components);
}

static async Task<StatusSnapshot> RunServiceRingsSnapshotAsync(HttpClient client, WorkerOptions options)
{
    var now = DateTimeOffset.UtcNow;
    var eastRing0 = await RunRegionalCheckoutAsync(client, "eastus-ring0", "East US Ring 0", options.SyntheticKey);
    var eastRing1 = await RunRegionalCheckoutAsync(client, "eastus-ring1", "East US Ring 1", options.SyntheticKey);
    var westRing0 = await RunRegionalCheckoutAsync(client, "westus-ring0", "West US Ring 0", options.SyntheticKey);
    var westRing1 = await RunRegionalCheckoutAsync(client, "westus-ring1", "West US Ring 1", options.SyntheticKey);
    var targets = new[] { eastRing0, eastRing1, westRing0, westRing1 };

    var previous = await ReadSnapshotAsync(options, options.ServiceRingsBlobName);
    var components = new[]
    {
        BuildComponent("checkout", "Checkout by ServiceRing", now, targets.All(target => StepStatus(target.PurchaseItem)), previous),
        BuildComponent("eastus-ring0", "East US ServiceRing 0 (5%)", now, eastRing0.Healthy, previous),
        BuildComponent("eastus-ring1", "East US ServiceRing 1 (45%)", now, eastRing1.Healthy, previous),
        BuildComponent("westus-ring0", "West US ServiceRing 0 (5%)", now, westRing0.Healthy, previous),
        BuildComponent("westus-ring1", "West US ServiceRing 1 (45%)", now, westRing1.Healthy, previous)
    };

    var overall = components.All(component => component.Status == PublicStatus.Operational)
        ? PublicStatus.Operational
        : PublicStatus.Degraded;

    return new StatusSnapshot(
        now,
        options.IntervalSeconds,
        overall,
        components);
}

static async Task<RegionalCheckoutResult> RunRegionalCheckoutAsync(
    HttpClient client,
    string targetSlice,
    string regionName,
    string syntheticKey)
{
    var cartId = $"worker-{targetSlice}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}";

    var getItem = await SendAsync(client, HttpMethod.Get, "/items/sku-100", targetSlice, syntheticKey);
    var addItem = await SendAsync(client, HttpMethod.Post, "/cart/items", targetSlice, syntheticKey, new
    {
        cartId,
        itemId = "sku-100",
        quantity = 1
    });
    var purchase = await SendAsync(client, HttpMethod.Post, "/purchase", targetSlice, syntheticKey, new
    {
        cartId,
        customerId = "synthetic-customer"
    });

    return new RegionalCheckoutResult(regionName, getItem, addItem, purchase);
}

static async Task<HttpStatusCode> SendAsync(
    HttpClient client,
    HttpMethod method,
    string path,
    string targetSlice,
    string syntheticKey,
    object? body = null)
{
    using var request = new HttpRequestMessage(method, path);
    request.Headers.Add("x-target-slice", targetSlice);
    request.Headers.Add("x-synthetic-key", syntheticKey);

    if (body is not null)
    {
        request.Content = JsonContent.Create(body);
    }

    using var response = await client.SendAsync(request);
    return response.StatusCode;
}

static StatusComponent BuildComponent(
    string id,
    string name,
    DateTimeOffset now,
    bool healthy,
    StatusSnapshot? previous)
{
    var status = healthy ? PublicStatus.Operational : PublicStatus.Degraded;
    var history = previous?.Components
        .FirstOrDefault(component => component.Id == id)?
        .History
        .TakeLast(59)
        .ToList() ?? [];

    history.Add(new StatusInterval(now, status));
    return new StatusComponent(id, name, status, history);
}

static bool StepStatus(HttpStatusCode statusCode)
{
    return (int)statusCode is >= 200 and <= 299;
}

static async Task<StatusSnapshot?> ReadSnapshotAsync(WorkerOptions options, string blobName)
{
    try
    {
        var blob = GetBlob(options, blobName);
        if (!await blob.ExistsAsync())
        {
            return null;
        }

        var response = await blob.DownloadContentAsync();
        return response.Value.Content.ToObjectFromJson<StatusSnapshot>(JsonDefaults.Options);
    }
    catch
    {
        return null;
    }
}

static async Task WriteSnapshotAsync(StatusSnapshot snapshot, WorkerOptions options, string blobName)
{
    var blob = GetBlob(options, blobName);
    await blob.UploadAsync(
        BinaryData.FromObjectAsJson(snapshot, JsonDefaults.Options),
        new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = "application/json"
            }
        });
}

static BlobClient GetBlob(WorkerOptions options, string blobName)
{
    var service = new BlobServiceClient(options.StorageConnectionString);
    var container = service.GetBlobContainerClient(options.ContainerName);
    container.CreateIfNotExists(PublicAccessType.None);
    return container.GetBlobClient(blobName);
}

internal sealed record WorkerOptions(
    string FrontDoorUrl,
    string SyntheticKey,
    string StorageConnectionString,
    string ContainerName,
    string PublicBlobName,
    string ServiceRingsBlobName,
    int IntervalSeconds)
{
    public static WorkerOptions FromEnvironment()
    {
        return new WorkerOptions(
            Required("FRONT_DOOR_URL").TrimEnd('/'),
            Required("SYNTHETIC_KEY"),
            Required("STATUS_STORAGE_CONNECTION_STRING"),
            Environment.GetEnvironmentVariable("STATUS_CONTAINER") ?? "status",
            Environment.GetEnvironmentVariable("PUBLIC_STATUS_BLOB") ?? "public-status.json",
            Environment.GetEnvironmentVariable("SERVICE_RINGS_STATUS_BLOB") ?? "service-rings-status.json",
            int.TryParse(Environment.GetEnvironmentVariable("CHECK_INTERVAL_SECONDS"), out var seconds) ? seconds : 30);
    }

    private static string Required(string name)
    {
        return Environment.GetEnvironmentVariable(name)
            ?? throw new InvalidOperationException($"{name} environment variable is required.");
    }
}

internal sealed record RegionalCheckoutResult(
    string RegionName,
    HttpStatusCode GetItem,
    HttpStatusCode AddItemToCart,
    HttpStatusCode PurchaseItem)
{
    public bool Healthy => StatusHelpers.StepStatus(GetItem) && StatusHelpers.StepStatus(AddItemToCart) && StatusHelpers.StepStatus(PurchaseItem);
}

internal sealed record StatusSnapshot(
    DateTimeOffset GeneratedAtUtc,
    int IntervalSeconds,
    string OverallStatus,
    IReadOnlyList<StatusComponent> Components);

internal sealed record StatusComponent(
    string Id,
    string Name,
    string Status,
    IReadOnlyList<StatusInterval> History);

internal sealed record StatusInterval(DateTimeOffset TimeUtc, string Status);

internal static class PublicStatus
{
    public const string Operational = "Operational";
    public const string Degraded = "Degraded";
}

internal static class StatusHelpers
{
    public static bool StepStatus(HttpStatusCode statusCode)
    {
        return (int)statusCode is >= 200 and <= 299;
    }
}

internal static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
}
