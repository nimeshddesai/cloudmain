using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CloudMain.RetailService.Tests;

public sealed class HealthEndpointTests
{
    [Fact]
    public async Task HealthEndpointReturnsOk()
    {
        using var factory = CreateFactory("v1");
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CheckoutSucceedsInV1()
    {
        using var factory = CreateFactory("v1");
        using var client = factory.CreateClient();

        var itemResponse = await client.GetAsync("/items/sku-100");
        var cartResponse = await client.PostAsJsonAsync("/cart/items", new
        {
            cartId = "test-cart-v1",
            itemId = "sku-100",
            quantity = 1
        });
        var purchaseResponse = await client.PostAsJsonAsync("/purchase", new
        {
            cartId = "test-cart-v1",
            customerId = "customer-1"
        });

        Assert.Equal(HttpStatusCode.OK, itemResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, cartResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, purchaseResponse.StatusCode);
    }

    [Fact]
    public async Task BadPatchFailsOnlyPurchaseItem()
    {
        using var factory = CreateFactory("v2-bad");
        using var client = factory.CreateClient();

        var itemResponse = await client.GetAsync("/items/sku-100");
        var cartResponse = await client.PostAsJsonAsync("/cart/items", new
        {
            cartId = "test-cart-v2-bad",
            itemId = "sku-100",
            quantity = 1
        });
        var purchaseResponse = await client.PostAsJsonAsync("/purchase", new
        {
            cartId = "test-cart-v2-bad",
            customerId = "customer-1"
        });

        Assert.Equal(HttpStatusCode.OK, itemResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, cartResponse.StatusCode);
        Assert.Equal(HttpStatusCode.InternalServerError, purchaseResponse.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory(string version)
    {
        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((_, configuration) =>
                {
                    configuration.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["Demo:Region"] = "eastus",
                        ["Demo:Slice"] = "ring0",
                        ["Demo:Version"] = version
                    });
                });
            });
    }
}
