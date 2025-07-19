// encryption.rs

use aes::{Aes128, Aes256};
use cbc::Encryptor;
use cipher::{BlockEncryptMut, KeyIvInit, block_padding::Pkcs7};
use lopdf::{Document, Object, Stream};

/// Which AES variant to use
pub enum AesStrength {
    Aes128,
    Aes256,
}

/// Derive AES key from a password using a simple method (not ideal for production)
pub fn derive_key(password: &str, strength: &AesStrength) -> Vec<u8> {
    let bytes = password.as_bytes();

    match strength {
        AesStrength::Aes128 => {
            let mut key = [0u8; 16];
            for (i, b) in bytes.iter().enumerate().take(16) {
                key[i] = *b;
            }
            key.to_vec()
        }
        AesStrength::Aes256 => {
            let mut key = [0u8; 32];
            for (i, b) in bytes.iter().enumerate().take(32) {
                key[i] = *b;
            }
            key.to_vec()
        }
    }
}

/// Encrypt bytes with AES CBC
pub fn encrypt_bytes(data: &[u8], key: &[u8], strength: &AesStrength) -> Vec<u8> {
    let iv = [0u8; 16]; // static IV — replace with random IV in production

    match strength {
        AesStrength::Aes128 => {
            let cipher = Encryptor::<Aes128>::new(key.into(), &iv.into());
            cipher.encrypt_padded_vec_mut::<Pkcs7>(data)
        }
        AesStrength::Aes256 => {
            let cipher = Encryptor::<Aes256>::new(key.into(), &iv.into());
            cipher.encrypt_padded_vec_mut::<Pkcs7>(data)
        }
    }
}

/// Encrypts all PDF stream content
pub fn encrypt_pdf_streams(doc: &mut Document, password: &str, strength: &AesStrength) {
    let key = derive_key(password, strength);

    for (_id, obj) in doc.objects.iter_mut() {
        if let Object::Stream(stream) = obj {
            let encrypted = encrypt_bytes(&stream.content, &key, strength);
            stream.set_plain_content(encrypted);
        }
    }
}
