using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Spydersoft.PitStop.Data.Migrations
{
    /// <inheritdoc />
    public partial class MaintenanceLogItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaintenanceLogItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaintenanceLogId = table.Column<int>(type: "integer", nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsWarrantyWork = table.Column<bool>(type: "boolean", nullable: false),
                    PartsCost = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    LaborCost = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    TotalCost = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceLogItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceLogItems_MaintenanceLogs_MaintenanceLogId",
                        column: x => x.MaintenanceLogId,
                        principalTable: "MaintenanceLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceLogItems_MaintenanceLogId",
                table: "MaintenanceLogItems",
                column: "MaintenanceLogId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceLogItems_ServiceType",
                table: "MaintenanceLogItems",
                column: "ServiceType");

            // Backfill: every existing log becomes a visit with exactly one item carrying its former
            // service type, description, warranty flag and costs.
            migrationBuilder.Sql("""
                INSERT INTO "MaintenanceLogItems"
                    ("MaintenanceLogId", "ServiceType", "Description", "IsWarrantyWork", "PartsCost", "LaborCost", "TotalCost")
                SELECT "Id", "ServiceType", "Description", "IsWarrantyWork", "PartsCost", "LaborCost", "TotalCost"
                FROM "MaintenanceLogs"
                ORDER BY "Id";
                """);

            migrationBuilder.DropColumn(
                name: "Description",
                table: "MaintenanceLogs");

            migrationBuilder.DropColumn(
                name: "IsWarrantyWork",
                table: "MaintenanceLogs");

            migrationBuilder.DropColumn(
                name: "LaborCost",
                table: "MaintenanceLogs");

            migrationBuilder.DropColumn(
                name: "PartsCost",
                table: "MaintenanceLogs");

            migrationBuilder.DropColumn(
                name: "ServiceType",
                table: "MaintenanceLogs");

            migrationBuilder.DropColumn(
                name: "TotalCost",
                table: "MaintenanceLogs");
        }

        /// <inheritdoc />
        /// <remarks>
        /// Lossy for visits with more than one item: only the first item (lowest Id) is copied back to the
        /// log. Visit-level cost is the sum of every item's cost, so spend totals are preserved.
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "MaintenanceLogs",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsWarrantyWork",
                table: "MaintenanceLogs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "LaborCost",
                table: "MaintenanceLogs",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PartsCost",
                table: "MaintenanceLogs",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceType",
                table: "MaintenanceLogs",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                table: "MaintenanceLogs",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "MaintenanceLogs" AS m
                SET "ServiceType" = f."ServiceType",
                    "Description" = f."Description",
                    "IsWarrantyWork" = f."IsWarrantyWork"
                FROM (
                    SELECT DISTINCT ON ("MaintenanceLogId") *
                    FROM "MaintenanceLogItems"
                    ORDER BY "MaintenanceLogId", "Id"
                ) AS f
                WHERE f."MaintenanceLogId" = m."Id";

                UPDATE "MaintenanceLogs" AS m
                SET "PartsCost" = t."PartsCost",
                    "LaborCost" = t."LaborCost",
                    "TotalCost" = t."TotalCost"
                FROM (
                    SELECT "MaintenanceLogId",
                           SUM("PartsCost") AS "PartsCost",
                           SUM("LaborCost") AS "LaborCost",
                           SUM(COALESCE("TotalCost",
                               CASE WHEN "PartsCost" IS NULL AND "LaborCost" IS NULL THEN NULL
                                    ELSE COALESCE("PartsCost", 0) + COALESCE("LaborCost", 0) END)) AS "TotalCost"
                    FROM "MaintenanceLogItems"
                    GROUP BY "MaintenanceLogId"
                ) AS t
                WHERE t."MaintenanceLogId" = m."Id";
                """);

            migrationBuilder.DropTable(
                name: "MaintenanceLogItems");
        }
    }
}
