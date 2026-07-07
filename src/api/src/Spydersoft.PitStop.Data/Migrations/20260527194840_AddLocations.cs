using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Spydersoft.PitStop.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "FillUps",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    GooglePlaceId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastUsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UseCount = table.Column<int>(type: "integer", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FillUps_LocationId",
                table: "FillUps",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_OwnerId",
                table: "Locations",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_OwnerId_LastUsedAt",
                table: "Locations",
                columns: new[] { "OwnerId", "LastUsedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Locations_OwnerId_Name",
                table: "Locations",
                columns: new[] { "OwnerId", "Name" });

            migrationBuilder.AddForeignKey(
                name: "FK_FillUps_Locations_LocationId",
                table: "FillUps",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Backfill: collapse distinct (OwnerId, StationName, StationAddress) groups
            // from existing FillUp rows into Location rows, then point each FillUp at its match.
            // Rows with no StationName stay LocationId = NULL.
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT
                        v.""OwnerId"" AS owner_id,
                        TRIM(f.""StationName"") AS name,
                        TRIM(COALESCE(f.""StationAddress"", '')) AS address_key,
                        f.""StationAddress"" AS address,
                        f.""Latitude"" AS latitude,
                        f.""Longitude"" AS longitude,
                        ROW_NUMBER() OVER (
                            PARTITION BY v.""OwnerId"",
                                         TRIM(f.""StationName""),
                                         TRIM(COALESCE(f.""StationAddress"", ''))
                            ORDER BY f.""FilledAt"" DESC
                        ) AS rn_recent,
                        COUNT(*) OVER (
                            PARTITION BY v.""OwnerId"",
                                         TRIM(f.""StationName""),
                                         TRIM(COALESCE(f.""StationAddress"", ''))
                        ) AS use_count,
                        MIN(f.""FilledAt"") OVER (
                            PARTITION BY v.""OwnerId"",
                                         TRIM(f.""StationName""),
                                         TRIM(COALESCE(f.""StationAddress"", ''))
                        ) AS created_at,
                        MAX(f.""FilledAt"") OVER (
                            PARTITION BY v.""OwnerId"",
                                         TRIM(f.""StationName""),
                                         TRIM(COALESCE(f.""StationAddress"", ''))
                        ) AS last_used_at
                    FROM ""FillUps"" f
                    INNER JOIN ""Vehicles"" v ON v.""Id"" = f.""VehicleId""
                    WHERE f.""StationName"" IS NOT NULL
                      AND TRIM(f.""StationName"") <> ''
                )
                INSERT INTO ""Locations""
                    (""OwnerId"", ""Name"", ""Address"", ""Latitude"", ""Longitude"",
                     ""CreatedAt"", ""LastUsedAt"", ""UseCount"", ""IsDeleted"")
                SELECT
                    owner_id, name, address, latitude, longitude,
                    created_at, last_used_at, use_count, FALSE
                FROM ranked
                WHERE rn_recent = 1;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""FillUps"" AS f
                SET ""LocationId"" = l.""Id""
                FROM ""Vehicles"" AS v, ""Locations"" AS l
                WHERE f.""VehicleId"" = v.""Id""
                  AND l.""OwnerId"" = v.""OwnerId""
                  AND l.""Name"" = TRIM(f.""StationName"")
                  AND COALESCE(l.""Address"", '') = TRIM(COALESCE(f.""StationAddress"", ''))
                  AND f.""StationName"" IS NOT NULL
                  AND TRIM(f.""StationName"") <> '';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FillUps_Locations_LocationId",
                table: "FillUps");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropIndex(
                name: "IX_FillUps_LocationId",
                table: "FillUps");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "FillUps");
        }
    }
}
