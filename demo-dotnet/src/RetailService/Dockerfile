FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY demo-dotnet/src/RetailService/RetailService.csproj demo-dotnet/src/RetailService/
RUN dotnet restore demo-dotnet/src/RetailService/RetailService.csproj

COPY demo-dotnet/src/RetailService/ demo-dotnet/src/RetailService/
RUN dotnet publish demo-dotnet/src/RetailService/RetailService.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "RetailService.dll"]
