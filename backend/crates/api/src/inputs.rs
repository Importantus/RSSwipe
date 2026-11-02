//! Request bodies. `deny_unknown_fields` and strict types mirror the old superstruct schemas.
use crate::extract::{present, Validate};
use crate::AppState;
use rsswipe_core::FieldError;
use serde::Deserialize;
use utoipa::ToSchema;

fn len_between(field: &str, v: &str, min: usize, max: usize, out: &mut Vec<FieldError>) {
    let n = v.chars().count();
    if n < min || n > max {
        out.push(FieldError::new(field, format!("must be between {min} and {max} characters long (got {n})")));
    }
}

fn email(field: &str, v: &str, out: &mut Vec<FieldError>) {
    if !v.contains('@') {
        out.push(FieldError::new(field, "must be an email address"));
    }
}

pub fn uuid(field: &str, v: &str, out: &mut Vec<FieldError>) {
    if v.chars().count() != 36 {
        out.push(FieldError::new(field, "must be an id (36 characters)"));
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct RegisterInput {
    /// 1-30 characters
    pub name: String,
    pub email: String,
    /// 8-100 characters
    pub password: String,
}

impl Validate for RegisterInput {
    fn validate(&self, _: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        len_between("name", &self.name, 1, 30, &mut e);
        email("email", &self.email, &mut e);
        len_between("password", &self.password, 8, 100, &mut e);
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

impl Validate for LoginInput {
    fn validate(&self, _: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        email("email", &self.email, &mut e);
        len_between("password", &self.password, 8, 100, &mut e);
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserUpdateInput {
    #[serde(default, deserialize_with = "present")]
    pub name: Option<String>,
    #[serde(default, deserialize_with = "present")]
    pub email: Option<String>,
    #[serde(default, deserialize_with = "present")]
    pub password: Option<String>,
    #[serde(default, rename = "oldPassword", deserialize_with = "present")]
    pub old_password: Option<String>,
}

impl Validate for UserUpdateInput {
    fn validate(&self, _: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        if let Some(v) = &self.name { len_between("name", v, 1, 30, &mut e); }
        if let Some(v) = &self.email { email("email", v, &mut e); }
        if let Some(v) = &self.password { len_between("password", v, 8, 100, &mut e); }
        if let Some(v) = &self.old_password { len_between("oldPassword", v, 8, 100, &mut e); }
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserDeleteInput {
    pub password: String,
}

impl Validate for UserDeleteInput {
    fn validate(&self, _: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        len_between("password", &self.password, 8, 100, &mut e);
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct SettingsUpdateInput {
    /// Milliseconds until read articles leave the reading list, `-1` = never
    #[serde(default, rename = "expTimeRead", deserialize_with = "present")]
    pub exp_time_read: Option<i32>,
    /// Milliseconds until unread articles leave the reading list, `-1` = never
    #[serde(default, rename = "expTimeUnread", deserialize_with = "present")]
    pub exp_time_unread: Option<i32>,
}
impl Validate for SettingsUpdateInput {}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct FeedCreateInput {
    pub url: String,
    #[serde(default, rename = "openInApp", deserialize_with = "present")]
    pub open_in_app: Option<bool>,
}

impl Validate for FeedCreateInput {
    fn validate(&self, s: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        len_between("url", &self.url, 1, s.core.config.max_url_length, &mut e);
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct FeedUpdateInput {
    #[serde(default, rename = "openInApp", deserialize_with = "present")]
    pub open_in_app: Option<bool>,
}
impl Validate for FeedUpdateInput {}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ArticleUpdateInput {
    #[serde(default, deserialize_with = "present")]
    pub read: Option<bool>,
    #[serde(default, deserialize_with = "present")]
    pub seen: Option<bool>,
    #[serde(default, deserialize_with = "present")]
    pub starred: Option<bool>,
    #[serde(default, deserialize_with = "present")]
    pub saved: Option<bool>,
}
impl Validate for ArticleUpdateInput {}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ContentBatchInput {
    /// Article ids, 1 to `CONTENT_PREFETCH_MAX_IDS`
    pub ids: Vec<String>,
}

impl Validate for ContentBatchInput {
    fn validate(&self, s: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        let max = s.core.config.content_prefetch_max_ids;
        if self.ids.is_empty() || self.ids.len() > max {
            e.push(FieldError::new("ids", format!("must contain between 1 and {max} ids")));
        }
        for (i, id) in self.ids.iter().enumerate() {
            uuid(&format!("ids[{i}]"), id, &mut e);
        }
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ArticleIdInput {
    pub id: String,
}

impl Validate for ArticleIdInput {
    fn validate(&self, _: &AppState) -> Vec<FieldError> {
        let mut e = vec![];
        uuid("id", &self.id, &mut e);
        e
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ReadingListClearInput {
    #[serde(rename = "onlyRead")]
    pub only_read: bool,
}
impl Validate for ReadingListClearInput {}
