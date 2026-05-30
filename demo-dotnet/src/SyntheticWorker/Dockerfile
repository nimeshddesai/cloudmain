FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY demo-dotnet/src/SyntheticWorker/SyntheticWorker.csproj demo-dotnet/src/SyntheticWorker/
RUN dotnet restore demo-dotnet/src/SyntheticWorker/SyntheticWorker.csproj

COPY demo-dotnet/src/SyntheticWorker/ demo-dotnet/src/SyntheticWorker/
RUN dotnet publish demo-dotnet/src/SyntheticWorker/SyntheticWorker.csproj \
    --configuration Release \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/runtime:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "SyntheticWorker.dll"]
