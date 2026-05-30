using Azure.Storage.Blobs;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/status", async (IConfiguration configuration) =>
    await ReadStatusAsync(configuration, "public-status.json", StatusSnapshot.PublicFallback()));
app.MapGet("/api/status/sliced", async (IConfiguration configuration) =>
    await ReadStatusAsync(configuration, "service-rings-status.json", StatusSnapshot.ServiceRingsFallback()));
app.MapGet("/api/status/service-rings", async (IConfiguration configuration) =>
    await ReadStatusAsync(configuration, "service-rings-status.json", StatusSnapshot.ServiceRingsFallback()));
app.MapGet("/sliced", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "sliced.html"));
});
app.MapGet("/service-rings", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "sliced.html"));
});
app.MapFallbackToFile("index.html");

app.Run();

static async Task<IResult> ReadStatusAsync(
    IConfiguration configuration,
    string defaultBlobName,
    StatusSnapshot fallback)
{
    var connectionString = configuration["StatusStorage:ConnectionString"];
    var containerName = configuration["StatusStorage:Container"] ?? "status";
    var blobName = defaultBlobName;

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Json(fallback);
    }

    try
    {
        var service = new BlobServiceClient(connectionString);
        var blob = service.GetBlobContainerClient(containerName).GetBlobClient(blobName);
        if (!await blob.ExistsAsync())
        {
            return Results.Json(fallback);
        }

        var response = await blob.DownloadContentAsync();
        return Results.Content(response.Value.Content.ToString(), "application/json");
    }
    catch
    {
        return Results.Json(fallback);
    }
}

internal sealed record StatusSnapshot(
    DateTimeOffset GeneratedAtUtc,
    int IntervalSeconds,
    string OverallStatus,
    IReadOnlyList<StatusComponent> Components)
{
    public static StatusSnapshot PublicFallback()
    {
        var now = DateTimeOffset.UtcNow;
        return new StatusSnapshot(
            now,
            30,
            "Operational",
            new[]
            {
                Component("catalog", "Catalog", now),
                Component("cart", "Cart", now),
                Component("checkout", "Checkout", now),
                Component("eastus", "East US", now),
                Component("westus", "West US", now)
            });
    }

    public static StatusSnapshot ServiceRingsFallback()
    {
        var now = DateTimeOffset.UtcNow;
        return new StatusSnapshot(
            now,
            30,
            "Operational",
            new[]
            {
                Component("checkout", "Checkout by ServiceRing", now),
                Component("eastus-ring0", "East US ServiceRing 0 (5%)", now),
                Component("eastus-ring1", "East US ServiceRing 1 (45%)", now),
                Component("westus-ring0", "West US ServiceRing 0 (5%)", now),
                Component("westus-ring1", "West US ServiceRing 1 (45%)", now)
            });
    }

    private static StatusComponent Component(string id, string name, DateTimeOffset now)
    {
        var history = Enumerable.Range(0, 60)
            .Select(index => new StatusInterval(now.AddSeconds((index - 59) * 30), "Operational"))
            .ToArray();

        return new StatusComponent(id, name, "Operational", history);
    }
}

internal sealed record StatusComponent(
    string Id,
    string Name,
    string Status,
    IReadOnlyList<StatusInterval> History);

internal sealed record StatusInterval(DateTimeOffset TimeUtc, string Status);
