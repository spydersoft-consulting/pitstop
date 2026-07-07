using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spydersoft.PitStop.Data.Migrations
{
    /// <inheritdoc />
    public partial class DropFillUpStationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "FillUps");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "FillUps");

            migrationBuilder.DropColumn(
                name: "StationAddress",
                table: "FillUps");

            migrationBuilder.DropColumn(
                name: "StationName",
                table: "FillUps");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "FillUps",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "FillUps",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StationAddress",
                table: "FillUps",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StationName",
                table: "FillUps",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}
