using System.Net.Http.Json;

var options = SyntheticOptions.Parse(args);
using var client = new HttpClient
{
    BaseAddress = new Uri(options.ServiceUrl)
};

if (!string.IsNullOrWhiteSpace(options.TargetSlice))
{
    client.DefaultRequestHeaders.Add("x-target-slice", options.TargetSlice);
}

if (!string.IsNullOrWhiteSpace(options.SyntheticKey))
{
    client.DefaultRequestHeaders.Add("x-synthetic-key", options.SyntheticKey);
}

var result = await RunCheckoutAsync(client, options);
PrintResult(result);
Environment.ExitCode = result.Ok ? 0 : 1;

static async Task<SyntheticResult> RunCheckoutAsync(HttpClient client, SyntheticOptions options)
{
    var cartId = $"synthetic-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}";
    var result = new SyntheticResult(options.ServiceUrl, options.TargetSlice);

    try
    {
        var item = await SendAsync(client, HttpMethod.Get, $"/items/{options.ItemId}");
        result.AddStep("GetItem", item.IsSuccessStatusCode, item.StatusCode);

        var addItem = await SendAsync(client, HttpMethod.Post, "/cart/items", new
        {
            cartId,
            itemId = options.ItemId,
            quantity = 1
        });
        result.AddStep("AddItemToCart", addItem.IsSuccessStatusCode, addItem.StatusCode);

        var purchase = await SendAsync(client, HttpMethod.Post, "/purchase", new
        {
            cartId,
            customerId = "synthetic-customer"
        });
        result.AddStep("PurchaseItem", purchase.IsSuccessStatusCode, purchase.StatusCode);

        return result;
    }
    catch (Exception ex)
    {
        result.Error = ex.Message;
        return result;
    }
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

static void PrintResult(SyntheticResult result)
{
    Console.WriteLine($"Synthetic checkout: {(result.Ok ? "PASS" : "FAIL")}");
    Console.WriteLine($"Service URL: {result.ServiceUrl}");

    if (!string.IsNullOrWhiteSpace(result.TargetSlice))
    {
        Console.WriteLine($"Target slice: {result.TargetSlice}");
    }

    foreach (var step in result.Steps)
    {
        Console.WriteLine($"  {step.Api}: {(step.Ok ? "PASS" : "FAIL")} ({(int)step.StatusCode})");
    }

    if (!string.IsNullOrWhiteSpace(result.Error))
    {
        Console.WriteLine($"Error: {result.Error}");
    }
}

internal sealed class SyntheticResult
{
    public SyntheticResult(string serviceUrl, string? targetSlice)
    {
        ServiceUrl = serviceUrl;
        TargetSlice = targetSlice;
    }

    public string ServiceUrl { get; }

    public string? TargetSlice { get; }

    public List<SyntheticStep> Steps { get; } = [];

    public string? Error { get; set; }

    public bool Ok => Error is null && Steps.Count > 0 && Steps.All(step => step.Ok);

    public void AddStep(string api, bool ok, System.Net.HttpStatusCode statusCode)
    {
        Steps.Add(new SyntheticStep(api, ok, statusCode));
    }
}

internal sealed record SyntheticStep(string Api, bool Ok, System.Net.HttpStatusCode StatusCode);

internal sealed record SyntheticOptions(
    string ServiceUrl,
    string ItemId,
    string? TargetSlice,
    string? SyntheticKey)
{
    public static SyntheticOptions Parse(string[] args)
    {
        var serviceUrl = "http://localhost:5000";
        var itemId = "sku-100";
        string? targetSlice = null;
        string? syntheticKey = null;
        var positionalUrlRead = false;

        for (var index = 0; index < args.Length && !positionalUrlRead; index++)
        {
            switch (args[index])
            {
                case "--url":
                    serviceUrl = ReadValue(args, ref index, "--url");
                    break;
                case "--item":
                    itemId = ReadValue(args, ref index, "--item");
                    break;
                case "--target-slice":
                    targetSlice = ReadValue(args, ref index, "--target-slice");
                    break;
                case "--synthetic-key":
                    syntheticKey = ReadValue(args, ref index, "--synthetic-key");
                    break;
                case "--help":
                case "-h":
                    PrintHelp();
                    Environment.Exit(0);
                    break;
                default:
                    if (!args[index].StartsWith("-", StringComparison.Ordinal))
                    {
                        serviceUrl = args[index];
                        positionalUrlRead = true;
                        continue;
                    }

                    throw new ArgumentException($"Unknown argument '{args[index]}'.");
            }
        }

        return new SyntheticOptions(serviceUrl.TrimEnd('/'), itemId, targetSlice, syntheticKey);
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

    private static void PrintHelp()
    {
        Console.WriteLine("CloudMain Synthetic Runner");
        Console.WriteLine();
        Console.WriteLine("Usage:");
        Console.WriteLine("  dotnet run --project demo-dotnet/src/SyntheticRunner -- --url http://localhost:5000");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  --url <url>                  Service or Front Door URL.");
        Console.WriteLine("  --item <itemId>              Item id to purchase. Default: sku-100.");
        Console.WriteLine("  --target-slice <slice>       Optional slice target, e.g. eastus-ring0.");
        Console.WriteLine("  --synthetic-key <secret>     Optional secret used by protected synthetic routing.");
    }
}
