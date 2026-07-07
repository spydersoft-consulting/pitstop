using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Spydersoft.PitStop.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Make = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Model = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Trim = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    InitialOdometer = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: false),
                    TankCapacityGallons = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FillUps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    FilledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OdometerReading = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: false),
                    GallonsAdded = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: false),
                    FuelGrade = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PricePerGallon = table.Column<decimal>(type: "numeric(6,3)", precision: 6, scale: 3, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    IsFullFillUp = table.Column<bool>(type: "boolean", nullable: false),
                    StationName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    StationAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MilesSinceLastFillUp = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: true),
                    MpgThisFillUp = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FillUps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FillUps_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FillUps_VehicleId_FilledAt",
                table: "FillUps",
                columns: new[] { "VehicleId", "FilledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_FillUps_VehicleId_OdometerReading",
                table: "FillUps",
                columns: new[] { "VehicleId", "OdometerReading" });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_OwnerId",
                table: "Vehicles",
                column: "OwnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FillUps");

            migrationBuilder.DropTable(
                name: "Vehicles");
        }
    }
}
