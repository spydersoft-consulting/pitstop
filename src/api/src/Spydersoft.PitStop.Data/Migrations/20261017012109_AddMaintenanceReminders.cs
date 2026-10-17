using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Spydersoft.PitStop.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaintenanceReminders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IntervalMiles = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: true),
                    IntervalMonths = table.Column<int>(type: "integer", nullable: true),
                    LeadMiles = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: true),
                    LeadDays = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SnoozedUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    LastDoneDate = table.Column<DateOnly>(type: "date", nullable: true),
                    LastDoneOdometer = table.Column<decimal>(type: "numeric(10,1)", precision: 10, scale: 1, nullable: true),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceReminders", x => x.Id);
                    table.CheckConstraint("CK_MaintenanceReminders_HasInterval", "\"IntervalMiles\" > 0 OR \"IntervalMonths\" > 0");
                    table.ForeignKey(
                        name: "FK_MaintenanceReminders_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReminderNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReminderId = table.Column<int>(type: "integer", nullable: false),
                    Stage = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CycleKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    NotifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReminderNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReminderNotifications_MaintenanceReminders_ReminderId",
                        column: x => x.ReminderId,
                        principalTable: "MaintenanceReminders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceReminders_VehicleId",
                table: "MaintenanceReminders",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderNotifications_ReminderId_Stage_CycleKey",
                table: "ReminderNotifications",
                columns: new[] { "ReminderId", "Stage", "CycleKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReminderNotifications");

            migrationBuilder.DropTable(
                name: "MaintenanceReminders");
        }
    }
}
