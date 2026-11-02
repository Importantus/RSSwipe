//! JWT and password handling, compatible with tokens and hashes issued by the TypeScript backend
//! (`jsonwebtoken` 9 / `bcrypt` 5, bcrypt cost 10, HS256).
use crate::{Error, Result};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

pub const BCRYPT_COST: u32 = 10;

#[derive(Serialize, Deserialize)]
struct Claims {
    id: String,
    #[serde(default)]
    iat: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    exp: Option<i64>,
}

/// Parses `expiresIn` like the `ms` package: `365d`, `12h`, `30 minutes`, a bare number is milliseconds.
pub fn parse_ms(input: &str) -> Option<f64> {
    let s = input.trim().to_lowercase();
    let idx = s.find(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-')).unwrap_or(s.len());
    let (num, unit) = s.split_at(idx);
    let n: f64 = num.parse().ok()?;
    const SEC: f64 = 1000.0;
    let mult = match unit.trim() {
        "" | "ms" | "msec" | "msecs" | "millisecond" | "milliseconds" => 1.0,
        "s" | "sec" | "secs" | "second" | "seconds" => SEC,
        "m" | "min" | "mins" | "minute" | "minutes" => 60.0 * SEC,
        "h" | "hr" | "hrs" | "hour" | "hours" => 3600.0 * SEC,
        "d" | "day" | "days" => 86_400.0 * SEC,
        "w" | "week" | "weeks" => 7.0 * 86_400.0 * SEC,
        "y" | "yr" | "yrs" | "year" | "years" => 365.25 * 86_400.0 * SEC,
        _ => return None,
    };
    Some(n * mult)
}

pub fn issue_token(user_id: &str, secret: &str, expires_in: &str) -> Result<String> {
    let iat = chrono::Utc::now().timestamp();
    let seconds = parse_ms(expires_in).ok_or_else(|| Error::internal("JWT_EXPIRATION is not a valid duration"))? / 1000.0;
    let claims = Claims { id: user_id.to_string(), iat, exp: Some((iat as f64 + seconds).floor() as i64) };
    jsonwebtoken::encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|e| Error::internal(format!("Could not sign token: {e}")))
}

/// Returns the user id of a valid token. Like the old middleware, the user's existence is not checked.
pub fn verify_token(token: &str, secret: &str) -> Result<String> {
    let mut v = Validation::new(Algorithm::HS256);
    v.algorithms = vec![Algorithm::HS256, Algorithm::HS384, Algorithm::HS512];
    v.required_spec_claims.clear(); // `exp` is only checked if present, as in jsonwebtoken for node
    v.validate_exp = true;
    v.leeway = 0;
    jsonwebtoken::decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &v)
        .map(|d| d.claims.id)
        .map_err(|_| Error::NotAuthorized)
}

/// Extracts the token the way the old middleware did: second whitespace-separated part of the header, scheme ignored.
pub fn token_from_header(value: &str) -> Option<&str> {
    value.split(' ').nth(1).filter(|t| !t.is_empty())
}

/// node-bcrypt hashes the password up to the first NUL byte, at most 72 bytes.
fn prepare(password: &str) -> Vec<u8> {
    let bytes = password.as_bytes();
    let end = bytes.iter().position(|b| *b == 0).unwrap_or(bytes.len()).min(72);
    bytes[..end].to_vec()
}

pub async fn hash_password(password: &str) -> Result<String> {
    let p = prepare(password);
    tokio::task::spawn_blocking(move || bcrypt::hash_with_result(p, BCRYPT_COST).map(|h| h.format_for_version(bcrypt::Version::TwoB)))
        .await
        .map_err(Error::internal)?
        .map_err(|e| Error::internal(format!("Could not hash password: {e}")))
}

pub async fn verify_password(password: &str, hash: &str) -> bool {
    let (p, h) = (prepare(password), hash.to_string());
    tokio::task::spawn_blocking(move || bcrypt::verify(p, &h).unwrap_or(false)).await.unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ms_parsing() {
        assert_eq!(parse_ms("365d"), Some(365.0 * 86_400_000.0));
        assert_eq!(parse_ms("30 minutes"), Some(1_800_000.0));
        assert_eq!(parse_ms("120"), Some(120.0));
        assert_eq!(parse_ms("abc"), None);
    }

    #[test]
    fn token_roundtrip_and_header() {
        let t = issue_token("u1", "secret", "1h").unwrap();
        assert_eq!(verify_token(&t, "secret").unwrap(), "u1");
        assert!(verify_token(&t, "other").is_err());
        assert_eq!(token_from_header("Bearer abc"), Some("abc"));
        assert_eq!(token_from_header("abc"), None);
    }

    #[tokio::test]
    async fn legacy_hashes_from_node_bcrypt() {
        assert!(verify_password("legacy-password", "$2b$10$Vhy0KzRbnLh4eiI2MuJeUuOft8AEaKxlOa0p1YLEvpjbG7OYDL74y").await);
        let long80 = "$2b$10$/zyuLYN8K9CLsiX.zP3EOe3V8Grw.wpy58NDz06SIs85A7DzlhshG";
        assert!(verify_password(&"A".repeat(80), long80).await);
        assert!(verify_password(&"A".repeat(72), long80).await);
        assert!(!verify_password(&"A".repeat(71), long80).await);
        assert!(verify_password("pässwörd-üß€", "$2b$10$rqUmlIl0IcQZWPOkC2q76OoM.OVYqdC4kozrFOM/LUPoz4saUAmsq").await);
    }
}
