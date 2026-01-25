#![allow(dead_code)]
//! Type-safe domain types for AI Reader
//!
//! This module provides semantic newtypes to prevent:
//! - Mixing different kinds of IDs
//! - Invalid role strings
//! - Invalid CFI/URL/path strings
//! - Illegal state representations

use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

// ============================================================================
// ID NEWTYPES - Prevent mixing different kinds of IDs
// ============================================================================

/// Database-assigned book ID (primary key)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct BookId(i64);

impl BookId {
    pub const fn new(id: i64) -> Self {
        Self(id)
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

impl fmt::Display for BookId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "BookId({})", self.0)
    }
}

/// Project Gutenberg book ID (external identifier)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct GutenbergId(i64);

impl GutenbergId {
    pub const fn new(id: i64) -> Self {
        Self(id)
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

impl fmt::Display for GutenbergId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "GutenbergId({})", self.0)
    }
}

/// Highlight ID (annotation primary key)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct HighlightId(i64);

impl HighlightId {
    pub const fn new(id: i64) -> Self {
        Self(id)
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

impl fmt::Display for HighlightId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "HighlightId({})", self.0)
    }
}

/// Chat thread ID
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ThreadId(i64);

impl ThreadId {
    pub const fn new(id: i64) -> Self {
        Self(id)
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

impl fmt::Display for ThreadId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ThreadId({})", self.0)
    }
}

/// Message ID
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MessageId(i64);

impl MessageId {
    pub const fn new(id: i64) -> Self {
        Self(id)
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

impl fmt::Display for MessageId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "MessageId({})", self.0)
    }
}

// ============================================================================
// ROLE ENUM - Make invalid roles unrepresentable
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

impl MessageRole {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Assistant => "assistant",
            Self::System => "system",
        }
    }
}

impl fmt::Display for MessageRole {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for MessageRole {
    type Err = TypeValidationError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user" => Ok(Self::User),
            "assistant" => Ok(Self::Assistant),
            "system" => Ok(Self::System),
            _ => Err(TypeValidationError::InvalidRole(s.to_string())),
        }
    }
}

// ============================================================================
// CFI (Canonical Fragment Identifier) - Validated newtype
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Cfi(String);

impl Cfi {
    /// Create a new CFI without validation (use this when data comes from trusted sources like DB)
    pub const fn new_unchecked(s: String) -> Self {
        Self(s)
    }

    /// Create a new CFI with basic validation
    pub fn new(s: String) -> Result<Self, TypeValidationError> {
        if s.is_empty() {
            return Err(TypeValidationError::EmptyCfi);
        }
        // Basic CFI validation - should start with "epubcfi("
        if !s.starts_with("epubcfi(") {
            return Err(TypeValidationError::InvalidCfiFormat(s));
        }
        Ok(Self(s))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl fmt::Display for Cfi {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ============================================================================
// DOM Path - Validated newtype for start_path/end_path
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct DomPath(String);

impl DomPath {
    pub const fn new_unchecked(s: String) -> Self {
        Self(s)
    }

    pub fn new(s: String) -> Result<Self, TypeValidationError> {
        if s.is_empty() {
            return Err(TypeValidationError::EmptyDomPath);
        }
        Ok(Self(s))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

// ============================================================================
// URL - Validated newtype
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Url(String);

impl Url {
    pub const fn new_unchecked(s: String) -> Self {
        Self(s)
    }

    pub fn new(s: String) -> Result<Self, TypeValidationError> {
        if s.is_empty() {
            return Err(TypeValidationError::EmptyUrl);
        }
        // Basic URL validation
        if !s.starts_with("http://") && !s.starts_with("https://") {
            return Err(TypeValidationError::InvalidUrlScheme(s));
        }
        Ok(Self(s))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

// ============================================================================
// Setting Key enum - Make invalid keys unrepresentable
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SettingKey {
    OpenaiApiKey,
    PocketVoiceId,
    DefaultModel,
    DefaultVoice,
    // Add new settings here as enum variants
}

impl SettingKey {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::OpenaiApiKey => "openai_api_key",
            Self::PocketVoiceId => "pocket_voice_id",
            Self::DefaultModel => "default_model",
            Self::DefaultVoice => "default_voice",
        }
    }

    pub const fn all() -> &'static [Self] {
        &[
            Self::OpenaiApiKey,
            Self::PocketVoiceId,
            Self::DefaultModel,
            Self::DefaultVoice,
        ]
    }
}

impl fmt::Display for SettingKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for SettingKey {
    type Err = TypeValidationError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "openai_api_key" => Ok(Self::OpenaiApiKey),
            "pocket_voice_id" => Ok(Self::PocketVoiceId),
            "default_model" => Ok(Self::DefaultModel),
            "default_voice" => Ok(Self::DefaultVoice),
            _ => Err(TypeValidationError::InvalidSettingKey(s.to_string())),
        }
    }
}

// ============================================================================
// Book State - Make illegal states unrepresentable
// ============================================================================

/// The state of a book's content
#[derive(Debug, Clone)]
pub enum BookContentState {
    /// Book has valid HTML content ready to display
    HtmlReady {
        html: String,
        first_image_index: Option<i32>,
    },
    /// Book has MOBI data that needs extraction
    NeedsExtraction { mobi_data: Vec<u8> },
    /// Book has corrupted/invalid HTML that needs regeneration from MOBI
    NeedsRegeneration {
        mobi_data: Vec<u8>,
        corrupt_html: String,
    },
    /// Book has no content data at all (error state)
    MissingContent,
}

impl BookContentState {
    /// Check if we have HTML ready to serve
    pub const fn has_html_ready(&self) -> bool {
        matches!(self, Self::HtmlReady { .. })
    }

    /// Check if we need to extract/regenerate
    pub const fn needs_processing(&self) -> bool {
        matches!(
            self,
            Self::NeedsExtraction { .. } | Self::NeedsRegeneration { .. }
        )
    }

    /// Get the HTML if ready, None otherwise
    pub fn html(&self) -> Option<&str> {
        match self {
            Self::HtmlReady { html, .. } => Some(html),
            _ => None,
        }
    }

    /// Get the MOBI data if available
    pub fn mobi_data(&self) -> Option<&[u8]> {
        match self {
            Self::NeedsExtraction { mobi_data } | Self::NeedsRegeneration { mobi_data, .. } => {
                Some(mobi_data)
            }
            _ => None,
        }
    }
}

// ============================================================================
// Validation Errors
// ============================================================================

#[derive(Debug, Error)]
pub enum TypeValidationError {
    #[error("Invalid message role: {0} (expected: user, assistant, or system)")]
    InvalidRole(String),

    #[error("Empty CFI")]
    EmptyCfi,

    #[error("Invalid CFI format: {0} (must start with 'epubcfi(')")]
    InvalidCfiFormat(String),

    #[error("Empty DOM path")]
    EmptyDomPath,

    #[error("Empty URL")]
    EmptyUrl,

    #[error("Invalid URL scheme: {0} (must start with http:// or https://)")]
    InvalidUrlScheme(String),

    #[error("Invalid setting key: {0}")]
    InvalidSettingKey(String),
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_type_safety() {
        let book_id = BookId::new(1);
        let gutenberg_id = GutenbergId::new(1);

        // This won't compile - different types!
        // let _: BookId = gutenberg_id;  // ✗ Compile error

        assert_eq!(book_id.get(), 1);
        assert_eq!(gutenberg_id.get(), 1);
        assert_ne!(book_id, BookId::new(2));
    }

    #[test]
    fn test_message_role_parsing() {
        assert_eq!("user".parse::<MessageRole>().unwrap(), MessageRole::User);
        assert_eq!(
            "assistant".parse::<MessageRole>().unwrap(),
            MessageRole::Assistant
        );
        assert_eq!(
            "system".parse::<MessageRole>().unwrap(),
            MessageRole::System
        );
        assert!("invalid".parse::<MessageRole>().is_err());
    }

    #[test]
    fn test_cfi_validation() {
        assert!(Cfi::new("epubcfi(/6/4[chap01ref]!/4/2)".to_string()).is_ok());
        assert!(Cfi::new("invalid".to_string()).is_err());
        assert!(Cfi::new("".to_string()).is_err());
    }

    #[test]
    fn test_url_validation() {
        assert!(Url::new("https://example.com/book.mobi".to_string()).is_ok());
        assert!(Url::new("http://example.com".to_string()).is_ok());
        assert!(Url::new("ftp://example.com".to_string()).is_err());
        assert!(Url::new("".to_string()).is_err());
    }

    #[test]
    fn test_setting_key_parsing() {
        assert_eq!(
            "openai_api_key".parse::<SettingKey>().unwrap(),
            SettingKey::OpenaiApiKey
        );
        assert!("invalid_key".parse::<SettingKey>().is_err());
    }

    #[test]
    fn test_book_content_state() {
        let ready = BookContentState::HtmlReady {
            html: "<html>test</html>".to_string(),
            first_image_index: Some(1),
        };

        assert!(ready.has_html_ready());
        assert!(!ready.needs_processing());
        assert_eq!(ready.html(), Some("<html>test</html>"));

        let needs_extraction = BookContentState::NeedsExtraction {
            mobi_data: vec![1, 2, 3],
        };

        assert!(!needs_extraction.has_html_ready());
        assert!(needs_extraction.needs_processing());
        assert_eq!(needs_extraction.html(), None);
        assert_eq!(needs_extraction.mobi_data(), Some(&[1u8, 2, 3][..]));
    }
}
