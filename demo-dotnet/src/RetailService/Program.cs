var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddSingleton<RetailStore>();

var app = builder.Build();

app.MapGet("/health", (IConfiguration configuration) => Results.Ok(new
{
    ok = true,
    service = "RetailService",
    region = configuration["Demo:Region"] ?? "local",
    slice = configuration["Demo:Slice"] ?? "local",
    version = configuration["Demo:Version"] ?? "v1"
}));

app.MapGet("/", () => Results.Ok(new
{
    name = "CloudMain Retail Observability Demo",
    service = "RetailService",
    status = "Retail APIs ready"
}));

app.MapGet("/items/{id}", (string id, RetailStore store) =>
{
    var item = store.GetItem(id);
    return item is null ? Results.NotFound(new ApiError("Item not found")) : Results.Ok(item);
})
.WithName("GetItem");

app.MapPost("/cart/items", (AddItemToCartRequest request, RetailStore store) =>
{
    var result = store.AddItemToCart(request);
    return result is null ? Results.NotFound(new ApiError("Item not found")) : Results.Ok(result);
})
.WithName("AddItemToCart");

app.MapPost("/purchase", (PurchaseItemRequest request, RetailStore store, IConfiguration configuration) =>
{
    var version = configuration["Demo:Version"] ?? "v1";
    if (PatchBehavior.IsBuggy(version))
    {
        return Results.Problem(
            title: "Purchase failed",
            detail: "Payment capture regression detected.",
            statusCode: StatusCodes.Status500InternalServerError);
    }

    var result = store.PurchaseItem(request, version);
    return result.Status switch
    {
        PurchaseStatus.CartNotFound => Results.NotFound(new ApiError("Cart not found")),
        PurchaseStatus.EmptyCart => Results.BadRequest(new ApiError("Cart is empty")),
        _ => Results.Ok(result.Purchase)
    };
})
.WithName("PurchaseItem");

app.Run();

public partial class Program
{
}

internal static class PatchBehavior
{
    public static bool IsBuggy(string version)
    {
        return version.Equals("Patch 2", StringComparison.OrdinalIgnoreCase)
            || version.Equals("patch-2", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class RetailStore
{
    private readonly object _lock = new();
    private readonly Dictionary<string, Item> _items = new(StringComparer.OrdinalIgnoreCase)
    {
        ["sku-100"] = new("sku-100", "Azure Trail Shoes", 129.00m),
        ["sku-200"] = new("sku-200", "Observability Backpack", 89.00m),
        ["sku-300"] = new("sku-300", "Rollback Hoodie", 59.00m)
    };
    private readonly Dictionary<string, List<CartLine>> _carts = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<Purchase> _purchases = [];

    public Item? GetItem(string id)
    {
        return _items.GetValueOrDefault(id);
    }

    public Cart? AddItemToCart(AddItemToCartRequest request)
    {
        if (!_items.ContainsKey(request.ItemId))
        {
            return null;
        }

        var cartId = string.IsNullOrWhiteSpace(request.CartId)
            ? Guid.NewGuid().ToString("N")
            : request.CartId;
        var quantity = request.Quantity <= 0 ? 1 : request.Quantity;

        lock (_lock)
        {
            if (!_carts.TryGetValue(cartId, out var lines))
            {
                lines = [];
                _carts[cartId] = lines;
            }

            lines.Add(new CartLine(request.ItemId, quantity));
            return new Cart(cartId, [.. lines]);
        }
    }

    public PurchaseResult PurchaseItem(PurchaseItemRequest request, string version)
    {
        lock (_lock)
        {
            if (!_carts.TryGetValue(request.CartId, out var lines))
            {
                return PurchaseResult.Failed(PurchaseStatus.CartNotFound);
            }

            if (lines.Count == 0)
            {
                return PurchaseResult.Failed(PurchaseStatus.EmptyCart);
            }

            var purchase = new Purchase(
                Guid.NewGuid().ToString("N"),
                request.CartId,
                string.IsNullOrWhiteSpace(request.CustomerId) ? "synthetic-customer" : request.CustomerId,
                [.. lines],
                DateTimeOffset.UtcNow,
                version);

            _purchases.Add(purchase);
            _carts.Remove(request.CartId);
            return PurchaseResult.Succeeded(purchase);
        }
    }
}

public sealed record Item(string Id, string Name, decimal Price);

public sealed record AddItemToCartRequest(string? CartId, string ItemId, int Quantity);

public sealed record Cart(string CartId, IReadOnlyList<CartLine> Items);

public sealed record CartLine(string ItemId, int Quantity);

public sealed record PurchaseItemRequest(string CartId, string? CustomerId);

public sealed record Purchase(
    string Id,
    string CartId,
    string CustomerId,
    IReadOnlyList<CartLine> Items,
    DateTimeOffset CreatedAt,
    string Version);

public sealed record ApiError(string Error);

public sealed record PurchaseResult(PurchaseStatus Status, Purchase? Purchase)
{
    public static PurchaseResult Succeeded(Purchase purchase)
    {
        return new PurchaseResult(PurchaseStatus.Succeeded, purchase);
    }

    public static PurchaseResult Failed(PurchaseStatus status)
    {
        return new PurchaseResult(status, null);
    }
}

public enum PurchaseStatus
{
    Succeeded,
    CartNotFound,
    EmptyCart
}
