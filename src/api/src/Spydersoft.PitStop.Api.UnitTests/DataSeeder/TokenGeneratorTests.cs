using System.IdentityModel.Tokens.Jwt;
using NUnit.Framework;
using Spydersoft.PitStop.DataSeeder;

namespace Spydersoft.PitStop.Api.UnitTests.DataSeeder;

[TestFixture]
public class TokenGeneratorTests
{
    private const string TestKey = "jRv3YFPH/19t9t5CgsEFgAkykfW5bQhHmceMprLgzlQ=";

    [Test]
    public void Generate_ProducesParseableJwt_WithExpectedSubjectAndScopes()
    {
        var tokenString = TokenGenerator.Generate(TestKey);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);

        Assert.That(token.Subject, Is.EqualTo(TokenGenerator.TestUserId));

        var scopes = token.Claims
            .Where(c => c.Type == "scope")
            .Select(c => c.Value)
            .ToList();
        Assert.That(scopes, Is.EquivalentTo(new[] { "pitstop:read", "pitstop:write" }));

        Assert.That(token.ValidTo, Is.GreaterThan(DateTime.UtcNow));
    }
}
