using Azure.Storage.Blobs;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/status", async (IConfiguration configuration) =>
{
    var connectionString = configuration["StatusStorage:ConnectionString"];
    var containerName = configuration["StatusStorage:Container"] ?? "status";
    var blobName = configuration["StatusStorage:Blob"] ?? "public-status.json";

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Json(StatusSnapshot.Fallback());
    }

    try
    {
        var service = new BlobServiceClient(connectionString);
        var blob = service.GetBlobContainerClient(containerName).GetBlobClient(blobName);
        if (!await blob.ExistsAsync())
        {
            return Results.Json(StatusSnapshot.Fallback());
        }

        var response = await blob.DownloadContentAsync();
        return Results.Content(response.Value.Content.ToString(), "application/json");
    }
    catch
    {
        return Results.Json(StatusSnapshot.Fallback());
    }
});

app.MapFallbackToFile("index.html");

app.Run();

internal sealed record StatusSnapshot(
    DateTimeOffset GeneratedAtUtc,
    int IntervalSeconds,
    string OverallStatus,
    IReadOnlyList<StatusComponent> Components)
{
    public static StatusSnapshot Fallback()
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
