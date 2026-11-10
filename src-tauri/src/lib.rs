//! Desktop shell for Coffer.
//!
//! The web app does all encryption itself; this side only moves already-encrypted text
//! between the app and the vault file. Every command refuses paths that are not a vault
//! file (`*.coffer`) or one of its siblings (`*.coffer.tmp`, `*.coffer.bakN`), so the
//! webview can never be used to read or overwrite anything else on disk.

use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

const VAULT_EXTENSION: &str = ".coffer";

fn is_backup_suffix(suffix: &str) -> bool {
    suffix
        .strip_prefix(".bak")
        .is_some_and(|digits| !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit()))
}

fn is_vault_file_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let Some(index) = lower.rfind(VAULT_EXTENSION) else {
        return false;
    };
    if index == 0 {
        return false;
    }
    let suffix = &lower[index + VAULT_EXTENSION.len()..];
    suffix.is_empty() || suffix == ".tmp" || is_backup_suffix(suffix)
}

fn vault_path(raw: &str) -> Result<PathBuf, String> {
    let path = Path::new(raw);
    let is_plain_absolute =
        path.is_absolute() && !path.components().any(|part| matches!(part, Component::ParentDir));
    let has_vault_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(is_vault_file_name);

    if is_plain_absolute && has_vault_name {
        Ok(path.to_path_buf())
    } else {
        Err("Not a Coffer vault file".to_string())
    }
}

fn describe(action: &str, error: std::io::Error) -> String {
    format!("Could not {action} the vault file: {error}")
}

#[tauri::command]
async fn vault_exists(path: String) -> Result<bool, String> {
    Ok(vault_path(&path)?.is_file())
}

#[tauri::command]
async fn vault_read(path: String) -> Result<String, String> {
    fs::read_to_string(vault_path(&path)?).map_err(|e| describe("read", e))
}

// Flushes to disk before returning, so the caller's rename only ever swaps in a
// completely written file.
#[tauri::command]
async fn vault_write(path: String, text: String) -> Result<(), String> {
    let path = vault_path(&path)?;
    let mut file = fs::File::create(path).map_err(|e| describe("write", e))?;
    file.write_all(text.as_bytes()).map_err(|e| describe("write", e))?;
    file.sync_all().map_err(|e| describe("write", e))
}

// Replaces `to` if it already exists.
#[tauri::command]
async fn vault_rename(from: String, to: String) -> Result<(), String> {
    fs::rename(vault_path(&from)?, vault_path(&to)?).map_err(|e| describe("save", e))
}

// Replaces `to` if it already exists.
#[tauri::command]
async fn vault_copy(from: String, to: String) -> Result<(), String> {
    fs::copy(vault_path(&from)?, vault_path(&to)?)
        .map(|_| ())
        .map_err(|e| describe("back up", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            vault_read,
            vault_write,
            vault_rename,
            vault_copy
        ])
        .run(tauri::generate_context!())
        .expect("error while running Coffer");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn absolute(file_name: &str) -> String {
        std::env::temp_dir().join(file_name).to_string_lossy().into_owned()
    }

    #[test]
    fn accepts_the_vault_and_its_siblings() {
        for name in [
            "my-vault.coffer",
            "My Vault.COFFER",
            "my-vault.coffer.tmp",
            "my-vault.coffer.bak1",
            "my-vault.coffer.bak12",
        ] {
            assert!(vault_path(&absolute(name)).is_ok(), "{name} should be accepted");
        }
    }

    #[test]
    fn rejects_everything_else() {
        for name in [
            "notes.txt",
            "my-vault.coffer.exe",
            "my-vault.coffer.bak",
            "my-vault.coffer.bakx",
            "my-vault.coffer.tmp.txt",
            ".coffer",
            "coffer",
        ] {
            assert!(vault_path(&absolute(name)).is_err(), "{name} should be rejected");
        }
    }

    #[test]
    fn rejects_relative_and_parent_paths() {
        assert!(vault_path("my-vault.coffer").is_err());
        assert!(vault_path("..\\my-vault.coffer").is_err());

        let escaping = std::env::temp_dir().join("..").join("my-vault.coffer");
        assert!(vault_path(&escaping.to_string_lossy()).is_err());
    }

    #[tokio::test]
    async fn write_then_rename_replaces_the_vault_and_copy_keeps_a_backup() {
        let dir = std::env::temp_dir().join(format!("coffer-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let at = |name: &str| dir.join(name).to_string_lossy().into_owned();

        vault_write(at("v.coffer"), "old".into()).await.unwrap();
        vault_copy(at("v.coffer"), at("v.coffer.bak1")).await.unwrap();
        vault_write(at("v.coffer.tmp"), "new".into()).await.unwrap();
        vault_rename(at("v.coffer.tmp"), at("v.coffer")).await.unwrap();

        assert_eq!(vault_read(at("v.coffer")).await.unwrap(), "new");
        assert_eq!(vault_read(at("v.coffer.bak1")).await.unwrap(), "old");
        assert!(!vault_exists(at("v.coffer.tmp")).await.unwrap());
        assert!(vault_write(at("other.txt"), "x".into()).await.is_err());

        fs::remove_dir_all(&dir).unwrap();
    }
}
