using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Spydersoft.PitStop.DataSeeder;

public static class TokenGenerator
{
    public const string TestUserId = "seeder-test-user";

    public static string Generate(string base64Key)
    {
        var key = new SymmetricSecurityKey(Convert.FromBase64String(base64Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: [
                new Claim(JwtRegisteredClaimNames.Sub, TestUserId),
                new Claim("scope", "pitstop:read"),
                new Claim("scope", "pitstop:write"),
            ],
            expires: DateTime.UtcNow.AddDays(365),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
