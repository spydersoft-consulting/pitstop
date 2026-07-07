FROM mcr.microsoft.com/dotnet/aspnet:10.0

LABEL org.opencontainers.image.source=https://github.com/spydersoft-consulting/pitstop-api
LABEL org.opencontainers.image.description="PitStop API"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app
COPY . /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "Spydersoft.PitStop.Api.dll"]
