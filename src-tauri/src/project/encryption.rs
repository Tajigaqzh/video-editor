use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use pbkdf2::pbkdf2_hmac;
use rand::Rng;
use sha2::Sha256;

/// 加密配置
pub struct EncryptionConfig {
    pub algorithm: &'static str,
    pub key_length: usize,
    pub iv_length: usize,
    pub salt_length: usize,
    pub tag_length: usize,
    pub iterations: u32,
}

impl Default for EncryptionConfig {
    fn default() -> Self {
        Self {
            algorithm: "aes-256-gcm",
            key_length: 32,     // 256 bits
            iv_length: 12,      // 96 bits (GCM standard)
            salt_length: 16,    // 128 bits
            tag_length: 16,     // 128 bits
            iterations: 100000, // PBKDF2 iterations
        }
    }
}

/// 使用 PBKDF2 从密码派生密钥
fn derive_key(password: &str, salt: &[u8], config: &EncryptionConfig) -> Vec<u8> {
    let mut key = vec![0u8; config.key_length];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, config.iterations, &mut key);
    key
}

/// 加密数据
pub fn encrypt_data(data: &str, password: &str) -> Result<String> {
    let config = EncryptionConfig::default();
    let mut rng = rand::thread_rng();

    // 生成随机盐值和 IV
    let salt: Vec<u8> = (0..config.salt_length).map(|_| rng.gen()).collect();
    let iv: Vec<u8> = (0..config.iv_length).map(|_| rng.gen()).collect();

    // 派生密钥
    let key = derive_key(password, &salt, &config);
    let cipher = Aes256Gcm::new_from_slice(&key).context("Failed to create cipher")?;

    // 加密数据
    let nonce = Nonce::from_slice(&iv);
    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|_| anyhow!("Encryption failed"))?;

    // 组合: salt + iv + ciphertext
    let mut result = Vec::new();
    result.extend_from_slice(&salt);
    result.extend_from_slice(&iv);
    result.extend_from_slice(&ciphertext);

    // 编码为 base64
    Ok(general_purpose::STANDARD.encode(&result))
}

/// 解密数据
pub fn decrypt_data(encrypted_data: &str, password: &str) -> Result<String> {
    let config = EncryptionConfig::default();

    // 解码 base64
    let buffer = general_purpose::STANDARD
        .decode(encrypted_data)
        .context("Failed to decode base64")?;

    // 提取 salt、iv 和密文
    if buffer.len() < config.salt_length + config.iv_length {
        anyhow::bail!("Invalid encrypted data format");
    }

    let salt = &buffer[0..config.salt_length];
    let iv = &buffer[config.salt_length..config.salt_length + config.iv_length];
    let ciphertext = &buffer[config.salt_length + config.iv_length..];

    // 派生密钥
    let key = derive_key(password, salt, &config);
    let cipher = Aes256Gcm::new_from_slice(&key).context("Failed to create cipher")?;

    // 解密数据
    let nonce = Nonce::from_slice(iv);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| anyhow!("Decryption failed - invalid password or corrupted data"))?;

    // 转换为字符串
    String::from_utf8(plaintext).context("Failed to convert decrypted data to UTF-8")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let data = r#"{"project": {"name": "test"}}"#;
        let password = "mySecurePassword";

        let encrypted = encrypt_data(data, password).unwrap();
        let decrypted = decrypt_data(&encrypted, password).unwrap();

        assert_eq!(data, decrypted);
    }

    #[test]
    fn test_wrong_password() {
        let data = r#"{"project": {"name": "test"}}"#;
        let password = "correctPassword";
        let wrong_password = "wrongPassword";

        let encrypted = encrypt_data(data, password).unwrap();
        let result = decrypt_data(&encrypted, wrong_password);

        assert!(result.is_err());
    }

    #[test]
    fn test_different_encryptions() {
        let data = r#"{"project": {"name": "test"}}"#;
        let password = "password";

        let encrypted1 = encrypt_data(data, password).unwrap();
        let encrypted2 = encrypt_data(data, password).unwrap();

        // 由于使用了随机盐值和 IV，两次加密结果应该不同
        assert_ne!(encrypted1, encrypted2);

        // 但都应该能解密为相同的数据
        assert_eq!(
            decrypt_data(&encrypted1, password).unwrap(),
            decrypt_data(&encrypted2, password).unwrap()
        );
    }
}
