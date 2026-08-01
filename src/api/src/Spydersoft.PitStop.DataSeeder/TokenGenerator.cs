using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Spydersoft.PitStop.DataSeeder;

public static class TokenGenerator
{
    public const string TestUserId = "seeder-test-user";

    // Matches the mock OIDC container's issuer (see AppHost) so tokens minted directly here validate
    // against the same Authority the API trusts in Testing, without a real OIDC round-trip.
    public const string MockOidcAuthority = "http://localhost:8200";

    public static string Generate(string base64Key)
    {
        var key = new SymmetricSecurityKey(Convert.FromBase64String(base64Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: MockOidcAuthority,
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
