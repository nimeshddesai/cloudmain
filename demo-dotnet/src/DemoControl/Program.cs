using System.Net.Http.Json;

var options = DemoOptions.Parse(args);
if (options.ShowHelp)
{
    PrintHelp();
    return;
}

var topology = DemoTopology.Create();
var targets = options.Mode switch
{
    "current" => topology.Current,
    "sliced" => topology.Sliced,
    _ => throw new ArgumentException($"Unknown mode '{options.Mode}'.")
};

Console.WriteLine("CloudMain Retail Demo Control");
Console.WriteLine($"Mode: {options.Mode}");
Console.WriteLine($"Patch version: {options.Version}");
Console.WriteLine($"Front Door URL: {options.ServiceUrl}");
Console.WriteLine();

foreach (var target in targets)
{
    Console.WriteLine($"[deploy] {options.Version} -> {target.Name} ({target.CapacityPercent}% capacity)");
    Console.WriteLine($"[synthetic] target slice: {target.TargetSlice}");

    var result = await RunSyntheticAsync(options, target);
    PrintSyntheticResult(result);

    var gate = HealthGate.Evaluate(result);
    if (!gate.Healthy)
    {
        Console.WriteLine($"[gate] FAILED for {target.Name}");
        foreach (var reason in gate.Reasons)
        {
            Console.WriteLine($"  - {reason}");
        }

        Console.WriteLine($"[rollback] rollback {target.Name} to v1");
        Console.WriteLine("[pipeline] stopped before next target");
        Environment.ExitCode = 1;
        return;
    }

    Console.WriteLine($"[gate] PASSED for {target.Name}");
    Console.WriteLine();
}

Console.WriteLine("[pipeline] rollout completed");

static async Task<SyntheticRunResult> RunSyntheticAsync(DemoOptions options, DeploymentTarget target)
{
    using var client = new HttpClient
    {
        BaseAddress = new Uri(options.ServiceUrl)
    };

    client.DefaultRequestHeaders.Add("x-target-slice", target.TargetSlice);
    if (!string.IsNullOrWhiteSpace(options.SyntheticKey))
    {
        client.DefaultRequestHeaders.Add("x-synthetic-key", options.SyntheticKey);
    }

    var cartId = $"demo-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}";
    var result = new SyntheticRunResult(target);

    try
    {
        var item = await SendAsync(client, HttpMethod.Get, "/items/sku-100");
        result.Add("GetItem", item.IsSuccessStatusCode, item.StatusCode);

        var addItem = await SendAsync(client, HttpMethod.Post, "/cart/items", new
        {
            cartId,
            itemId = "sku-100",
            quantity = 1
        });
        result.Add("AddItemToCart", addItem.IsSuccessStatusCode, addItem.StatusCode);

        var purchase = await SendAsync(client, HttpMethod.Post, "/purchase", new
        {
            cartId,
            customerId = "synthetic-customer"
        });
        result.Add("PurchaseItem", purchase.IsSuccessStatusCode, purchase.StatusCode);
    }
    catch (Exception ex)
    {
        result.Error = ex.Message;
    }

    return result;
}

static async Task<HttpResponseMessage> SendAsync(
    HttpClient client,
    HttpMethod method,
    string path,
    object? body = null)
{
    using var request = new HttpRequestMessage(method, path);
    if (body is not null)
    {
        request.Content = JsonContent.Create(body);
    }

    return await client.SendAsync(request);
}

static void PrintSyntheticResult(SyntheticRunResult result)
{
    foreach (var step in result.Steps)
    {
        Console.WriteLine($"  {step.Api}: {(step.Ok ? "PASS" : "FAIL")} ({(int)step.StatusCode})");
    }

    if (!string.IsNullOrWhiteSpace(result.Error))
    {
        Console.WriteLine($"  Error: {result.Error}");
    }
}

static void PrintHelp()
{
    Console.WriteLine("CloudMain Retail Demo Control");
    Console.WriteLine();
    Console.WriteLine("Usage:");
    Console.WriteLine("  dotnet run --project demo-dotnet/src/DemoControl -- current --version v2-bad --url https://retail-demo.example.com --synthetic-key <secret>");
    Console.WriteLine("  dotnet run --project demo-dotnet/src/DemoControl -- sliced --version v2-bad --url https://retail-demo.example.com --synthetic-key <secret>");
    Console.WriteLine();
    Console.WriteLine("Modes:");
    Console.WriteLine("  current   East US 50%, then West US 50%.");
    Console.WriteLine("  sliced    East US Ring0 5%, East US Ring1 45%, West US Ring0 5%, West US Ring1 45%.");
}

internal sealed record DemoOptions(
    string Mode,
    string Version,
    string ServiceUrl,
    string? SyntheticKey,
    bool ShowHelp)
{
    public static DemoOptions Parse(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help") || args.Contains("-h"))
        {
            return new DemoOptions("current", "v2-bad", "http://localhost:5000", null, true);
        }

        var mode = args[0].ToLowerInvariant();
        var version = "v2-bad";
        var serviceUrl = "http://localhost:5000";
        string? syntheticKey = null;

        for (var index = 1; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--version":
                    version = ReadValue(args, ref index, "--version");
                    break;
                case "--url":
                    serviceUrl = ReadValue(args, ref index, "--url");
                    break;
                case "--synthetic-key":
                    syntheticKey = ReadValue(args, ref index, "--synthetic-key");
                    break;
                default:
                    throw new ArgumentException($"Unknown argument '{args[index]}'.");
            }
        }

        return new DemoOptions(mode, version, serviceUrl.TrimEnd('/'), syntheticKey, false);
    }

    private static string ReadValue(string[] args, ref int index, string name)
    {
        if (index + 1 >= args.Length)
        {
            throw new ArgumentException($"Missing value for {name}.");
        }

        index++;
        return args[index];
    }
}

internal sealed record DeploymentTarget(string Name, string TargetSlice, int CapacityPercent);

internal sealed record DemoTopology(
    IReadOnlyList<DeploymentTarget> Current,
    IReadOnlyList<DeploymentTarget> Sliced)
{
    public static DemoTopology Create()
    {
        return new DemoTopology(
            [
                new("East US", "eastus", 50),
                new("West US", "westus", 50)
            ],
            [
                new("East US Ring0", "eastus-ring0", 5),
                new("East US Ring1", "eastus-ring1", 45),
                new("West US Ring0", "westus-ring0", 5),
                new("West US Ring1", "westus-ring1", 45)
            ]);
    }
}

internal sealed class SyntheticRunResult
{
    public SyntheticRunResult(DeploymentTarget target)
    {
        Target = target;
    }

    public DeploymentTarget Target { get; }

    public List<SyntheticStep> Steps { get; } = [];

    public string? Error { get; set; }

    public void Add(string api, bool ok, System.Net.HttpStatusCode statusCode)
    {
        Steps.Add(new SyntheticStep(api, ok, statusCode));
    }
}

internal sealed record SyntheticStep(string Api, bool Ok, System.Net.HttpStatusCode StatusCode);

internal sealed record HealthGateResult(bool Healthy, IReadOnlyList<string> Reasons);

internal static class HealthGate
{
    public static HealthGateResult Evaluate(SyntheticRunResult result)
    {
        var reasons = new List<string>();

        if (!string.IsNullOrWhiteSpace(result.Error))
        {
            reasons.Add(result.Error);
        }

        foreach (var step in result.Steps.Where(step => !step.Ok))
        {
            reasons.Add($"{step.Api} failed with HTTP {(int)step.StatusCode}");
        }

        if (result.Steps.Count == 0)
        {
            reasons.Add("No synthetic steps completed.");
        }

        return new HealthGateResult(reasons.Count == 0, reasons);
    }
}
