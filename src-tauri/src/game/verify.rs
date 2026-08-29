//! 可恢复的安装完整性校验：并行哈希、进度投影与断点会话。
//!
//! MD5 是 Merkle–Damgård 链式摘要，单文件无法在 GPU 上按块并行。
//! 因此扫描用多线程占满 CPU，并对顺序读取开启 Windows SEQUENTIAL_SCAN；
//! 把整文件搬上 GPU 再串行压缩通常更慢，故不走 GPU 路径。
//! @since Beta v0.12.0

use super::{
  hoyoplay::GameBranches,
  model::{GameInstallation, PackagePlanTarget, PackageVerifyState, PackageVerifySummary},
  package::TaskReservation,
  path_guard::resolve_optional_manifest_file,
  planner::{
    PlanFile, build_repair_parts, load_verify_target, manifest_digest, persist_plan_parts,
  },
};
use chrono::Utc;
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use std::{
  fs::{self, File, OpenOptions},
  io::{Read, Write},
  path::{Path, PathBuf},
  sync::{
    Arc, Mutex,
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const SESSION_SCHEMA_VERSION: u32 = 1;
const MAX_SESSION_BYTES: usize = 16 * 1024 * 1024;
const HASH_BUFFER_SIZE: usize = 1024 * 1024;
const MIN_CONCURRENCY: usize = 4;
const MAX_CONCURRENCY: usize = 32;
const PROGRESS_TICK: Duration = Duration::from_millis(250);

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct VerifySession {
  schema_version: u32,
  session_id: String,
  installation_id: String,
  version: String,
  manifest_digest: String,
  state: PackageVerifyState,
  total_files: usize,
  completed_files: usize,
  total_bytes: u64,
  hashed_bytes: u64,
  cursor: usize,
  mismatched: Vec<PlanFile>,
  current_file: Option<String>,
  bytes_per_second: u64,
  eta_seconds: Option<u64>,
  elapsed_ms: u64,
  started_at: String,
  updated_at: String,
  error_message: Option<String>,
  plan: Option<super::model::PackagePlanSummary>,
}

impl VerifySession {
  fn summary(&self, run_elapsed: Duration) -> PackageVerifySummary {
    let current_ms = u64::try_from(run_elapsed.as_millis()).unwrap_or(u64::MAX);
    let total_elapsed_ms = self.elapsed_ms.max(current_ms);
    PackageVerifySummary {
      session_id: self.session_id.clone(),
      installation_id: self.installation_id.clone(),
      version: self.version.clone(),
      state: self.state,
      healthy: if self.state.is_active() {
        None
      } else if self.state == PackageVerifyState::Completed {
        Some(self.mismatched.is_empty())
      } else {
        None
      },
      issue_count: self.mismatched.len(),
      plan: self.plan.clone(),
      total_files: self.total_files,
      completed_files: self.completed_files,
      total_bytes: self.total_bytes,
      hashed_bytes: self.hashed_bytes,
      current_file: self.current_file.clone(),
      bytes_per_second: self.bytes_per_second,
      eta_seconds: self.eta_seconds,
      elapsed_ms: current_ms,
      total_elapsed_ms,
      error_message: self.error_message.clone(),
      updated_at: self.updated_at.clone(),
    }
  }
}

struct ActiveVerify {
  run_id: String,
  canceled: Arc<AtomicBool>,
  dropped: Arc<AtomicBool>,
  session: Arc<Mutex<VerifySession>>,
  run_started: Instant,
}

pub(crate) struct VerifyRuntime {
  active: Mutex<std::collections::HashMap<String, ActiveVerify>>,
}

impl VerifyRuntime {
  pub(crate) fn new() -> Self {
    Self { active: Mutex::new(std::collections::HashMap::new()) }
  }

  pub(crate) fn is_running(&self, installation_id: &str) -> Result<bool, String> {
    let active = self.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?;
    Ok(active.contains_key(installation_id))
  }

  pub(crate) fn cancel(&self, installation_id: &str) -> Result<(), String> {
    let active = self.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?;
    let task =
      active.get(installation_id).ok_or_else(|| "当前没有正在运行的完整性校验".to_string())?;
    task.canceled.store(true, Ordering::Release);
    Ok(())
  }

  pub(crate) fn clear(&self, task_root: &Path, installation_id: &str) -> Result<(), String> {
    let active_task = {
      let active = self.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?;
      active.get(installation_id).map(|task| {
        (Arc::clone(&task.canceled), Arc::clone(&task.dropped), Arc::clone(&task.session))
      })
    };
    if let Some((canceled, dropped, session)) = active_task {
      let session = session.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
      dropped.store(true, Ordering::Release);
      canceled.store(true, Ordering::Release);
      return delete_session(task_root, &session.installation_id);
    }
    delete_session(task_root, installation_id)
  }

  pub(crate) fn status(
    &self,
    task_root: &Path,
    installation_id: &str,
  ) -> Result<Option<PackageVerifySummary>, String> {
    if let Some(active) =
      self.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?.get(installation_id)
    {
      let session = active.session.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
      return Ok(Some(session.summary(active.run_started.elapsed())));
    }
    load_session(task_root, installation_id)
      .map(|session| session.map(|value| value.summary(Duration::ZERO)))
  }
}

pub(crate) fn start_verify(
  runtime: &Arc<VerifyRuntime>,
  app_handle: AppHandle,
  task_root: PathBuf,
  installation: GameInstallation,
  branches: GameBranches,
  reservation: TaskReservation,
) -> Result<PackageVerifySummary, String> {
  {
    let active = runtime.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?;
    if let Some(running) = active.get(&installation.id) {
      let session = running.session.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
      return Ok(session.summary(running.run_started.elapsed()));
    }
  }

  let canceled = Arc::new(AtomicBool::new(false));
  let dropped = Arc::new(AtomicBool::new(false));
  let runtime_handle = Arc::clone(runtime);
  let installation_id = installation.id.clone();
  let initial = initial_session(&task_root, &installation)?;
  let shared = Arc::new(Mutex::new(initial));
  let run_started = Instant::now();
  let run_id = Uuid::new_v4().to_string();
  {
    let mut active = runtime.active.lock().map_err(|_| "完整性校验锁已损坏".to_string())?;
    if let Some(running) = active.get(&installation.id) {
      let session = running.session.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
      return Ok(session.summary(running.run_started.elapsed()));
    }
    active.insert(
      installation_id.clone(),
      ActiveVerify {
        run_id: run_id.clone(),
        canceled: Arc::clone(&canceled),
        dropped: Arc::clone(&dropped),
        session: Arc::clone(&shared),
        run_started,
      },
    );
  }

  let summary_session = Arc::clone(&shared);
  tauri::async_runtime::spawn(async move {
    let _reservation = reservation;
    run_verify(app_handle, task_root, installation, branches, shared, canceled, dropped).await;
    if let Ok(mut active) = runtime_handle.active.lock()
      && active.get(&installation_id).is_some_and(|task| task.run_id == run_id)
    {
      active.remove(&installation_id);
    }
  });
  let session = summary_session.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  Ok(session.summary(Duration::ZERO))
}

fn initial_session(
  task_root: &Path,
  installation: &GameInstallation,
) -> Result<VerifySession, String> {
  let version = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法校验资源完整性".to_string())?;
  match load_session(task_root, &installation.id)? {
    Some(mut existing)
      if existing.version == version && existing.state != PackageVerifyState::Completed =>
    {
      existing.state = PackageVerifyState::Scanning;
      existing.error_message = None;
      existing.current_file = Some("正在恢复完整性校验…".to_string());
      existing.touch();
      Ok(existing)
    }
    _ => new_pending_session(installation),
  }
}

fn new_pending_session(installation: &GameInstallation) -> Result<VerifySession, String> {
  let version = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法校验资源完整性".to_string())?;
  let now = Utc::now().to_rfc3339();
  Ok(VerifySession {
    schema_version: SESSION_SCHEMA_VERSION,
    session_id: Uuid::new_v4().to_string(),
    installation_id: installation.id.clone(),
    version: version.to_string(),
    manifest_digest: String::new(),
    state: PackageVerifyState::Scanning,
    total_files: 0,
    completed_files: 0,
    total_bytes: 0,
    hashed_bytes: 0,
    cursor: 0,
    mismatched: Vec::new(),
    current_file: Some("正在读取远端清单…".to_string()),
    bytes_per_second: 0,
    eta_seconds: None,
    elapsed_ms: 0,
    started_at: now.clone(),
    updated_at: now,
    error_message: None,
    plan: None,
  })
}

async fn run_verify(
  app_handle: AppHandle,
  task_root: PathBuf,
  installation: GameInstallation,
  branches: GameBranches,
  shared: Arc<Mutex<VerifySession>>,
  canceled: Arc<AtomicBool>,
  dropped: Arc<AtomicBool>,
) {
  let result = prepare_and_scan(
    &app_handle,
    &task_root,
    &installation,
    &branches,
    &shared,
    &canceled,
    &dropped,
  )
  .await;
  if let Err(error) = result {
    if dropped.load(Ordering::Acquire) {
      let _ = delete_session(&task_root, &installation.id);
      return;
    }
    if let Ok(mut session) = shared.lock() {
      if dropped.load(Ordering::Acquire) {
        let _ = delete_session(&task_root, &session.installation_id);
        return;
      }
      if session.state == PackageVerifyState::Scanning {
        session.state = PackageVerifyState::Failed;
        session.error_message = Some(error);
        session.current_file = None;
        session.bytes_per_second = 0;
        session.eta_seconds = None;
        session.touch();
        let _ = persist_session(&task_root, &session);
        emit_verify(&app_handle, &session.summary(Duration::ZERO));
      }
    }
  }
}

async fn prepare_and_scan(
  app_handle: &AppHandle,
  task_root: &Path,
  installation: &GameInstallation,
  branches: &GameBranches,
  shared: &Arc<Mutex<VerifySession>>,
  canceled: &Arc<AtomicBool>,
  dropped: &Arc<AtomicBool>,
) -> Result<(), String> {
  let version = installation
    .version
    .as_deref()
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "本地游戏版本未知，无法校验资源完整性".to_string())?
    .to_string();
  let scheme = installation.scheme_id.ok_or_else(|| "无法识别游戏渠道".to_string())?;
  let (build, inventory) = load_verify_target(installation, branches).await?;
  let digest = manifest_digest(&build);
  let total_bytes = inventory.iter().try_fold(0_u64, |total, file| {
    total.checked_add(file.size).ok_or_else(|| "完整性校验字节数溢出".to_string())
  })?;
  let mut session = match load_session(task_root, &installation.id)? {
    Some(existing)
      if existing.version == version
        && existing.manifest_digest == digest
        && existing.cursor <= inventory.len()
        && existing.state != PackageVerifyState::Completed =>
    {
      existing
    }
    _ => {
      let now = Utc::now().to_rfc3339();
      VerifySession {
        schema_version: SESSION_SCHEMA_VERSION,
        session_id: Uuid::new_v4().to_string(),
        installation_id: installation.id.clone(),
        version: version.clone(),
        manifest_digest: digest.clone(),
        state: PackageVerifyState::Scanning,
        total_files: inventory.len(),
        completed_files: 0,
        total_bytes,
        hashed_bytes: 0,
        cursor: 0,
        mismatched: Vec::new(),
        current_file: None,
        bytes_per_second: 0,
        eta_seconds: None,
        elapsed_ms: 0,
        started_at: now.clone(),
        updated_at: now,
        error_message: None,
        plan: None,
      }
    }
  };
  session.total_files = inventory.len();
  session.total_bytes = total_bytes;
  session.manifest_digest = digest;
  session.state = PackageVerifyState::Scanning;
  session.error_message = None;
  session.plan = None;
  session.touch();
  {
    let mut shared_session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
    if dropped.load(Ordering::Acquire) {
      delete_session(task_root, &shared_session.installation_id)?;
      return Ok(());
    }
    persist_session(task_root, &session)?;
    *shared_session = session.clone();
  }
  emit_verify(app_handle, &session.summary(Duration::ZERO));

  let game_root = PathBuf::from(&installation.root_path);
  let scan_shared = Arc::clone(shared);
  let scan_canceled = Arc::clone(canceled);
  let scan_dropped = Arc::clone(dropped);
  let scan_task_root = task_root.to_path_buf();
  let scan_app = app_handle.clone();
  let mismatched = tauri::async_runtime::spawn_blocking(move || {
    scan_inventory(
      &scan_app,
      &scan_task_root,
      &game_root,
      &inventory,
      &scan_shared,
      &scan_canceled,
      &scan_dropped,
    )
  })
  .await
  .map_err(|error| format!("完整性校验任务异常退出：{error}"))??;

  if dropped.load(Ordering::Acquire) {
    delete_session(task_root, &installation.id)?;
    return Ok(());
  }
  if canceled.load(Ordering::Acquire) {
    finish_canceled(shared, task_root, app_handle, dropped)?;
    return Ok(());
  }

  let plan = if mismatched.is_empty() {
    None
  } else {
    Some(persist_plan_parts(
      installation,
      scheme,
      PackagePlanTarget::Main,
      &version,
      &version,
      build_repair_parts(build, &mismatched)?,
      task_root,
      None,
    )?)
  };
  finish_completed(shared, task_root, app_handle, mismatched, plan, dropped)
}

fn scan_inventory(
  app_handle: &AppHandle,
  task_root: &Path,
  game_root: &Path,
  inventory: &[PlanFile],
  shared: &Arc<Mutex<VerifySession>>,
  canceled: &Arc<AtomicBool>,
  dropped: &Arc<AtomicBool>,
) -> Result<Vec<PlanFile>, String> {
  let (mut cursor, mut hashed_bytes, mut mismatched, baseline_elapsed, hashed_at_start) = {
    let session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
    (
      session.cursor,
      session.hashed_bytes,
      session.mismatched.clone(),
      Duration::from_millis(session.elapsed_ms),
      session.hashed_bytes,
    )
  };
  let run_started = Instant::now();
  let hashed_counter = AtomicU64::new(hashed_bytes);
  let current_file = Mutex::new(None::<String>);
  let tick_stop = AtomicBool::new(false);
  std::thread::scope(|scope| {
    scope.spawn(|| {
      while !tick_stop.load(Ordering::Acquire) {
        std::thread::sleep(PROGRESS_TICK);
        if tick_stop.load(Ordering::Acquire) || dropped.load(Ordering::Acquire) {
          return;
        }
        let hashed = hashed_counter.load(Ordering::Relaxed);
        let current = current_file.lock().ok().and_then(|guard| guard.clone());
        if touch_progress(shared, hashed, current, hashed_at_start, baseline_elapsed, run_started)
          .is_err()
        {
          return;
        }
        let _ = emit_current(app_handle, shared, run_started, dropped);
      }
    });
    let scan_result = (|| -> Result<(), String> {
      while cursor < inventory.len() {
        if canceled.load(Ordering::Acquire) {
          break;
        }
        let remaining = &inventory[cursor..];
        let batch_len = remaining.len().min(verify_concurrency());
        let batch = &remaining[..batch_len];
        let hashed_before_batch = hashed_counter.load(Ordering::Relaxed);
        let batch_mismatched =
          hash_batch(game_root, batch, &hashed_counter, &current_file, canceled)?;
        if canceled.load(Ordering::Acquire) {
          hashed_counter.store(hashed_before_batch, Ordering::Relaxed);
          refresh_session(
            shared,
            cursor,
            hashed_before_batch,
            &mismatched,
            None,
            hashed_at_start,
            baseline_elapsed,
            run_started,
          )?;
          persist_current(shared, task_root, dropped)?;
          emit_current(app_handle, shared, run_started, dropped)?;
          break;
        }
        mismatched.extend(batch_mismatched);
        hashed_bytes = hashed_counter.load(Ordering::Relaxed);
        cursor += batch_len;
        refresh_session(
          shared,
          cursor,
          hashed_bytes,
          &mismatched,
          current_file.lock().map_err(|_| "完整性校验进度锁已损坏".to_string())?.clone(),
          hashed_at_start,
          baseline_elapsed,
          run_started,
        )?;
        persist_current(shared, task_root, dropped)?;
        emit_current(app_handle, shared, run_started, dropped)?;
      }
      Ok(())
    })();
    tick_stop.store(true, Ordering::Release);
    scan_result
  })?;
  refresh_session(
    shared,
    cursor,
    hashed_counter.load(Ordering::Relaxed),
    &mismatched,
    None,
    hashed_at_start,
    baseline_elapsed,
    run_started,
  )?;
  persist_current(shared, task_root, dropped)?;
  Ok(mismatched)
}

fn hash_batch(
  game_root: &Path,
  files: &[PlanFile],
  hashed_bytes: &AtomicU64,
  current_file: &Mutex<Option<String>>,
  canceled: &AtomicBool,
) -> Result<Vec<PlanFile>, String> {
  if files.is_empty() {
    return Ok(Vec::new());
  }
  let next = AtomicUsize::new(0);
  let mismatched = Mutex::new(Vec::new());
  let error = Mutex::new(None::<String>);
  let workers = files.len().min(verify_concurrency()).max(1);
  std::thread::scope(|scope| {
    for _ in 0..workers {
      scope.spawn(|| {
        loop {
          if canceled.load(Ordering::Acquire) {
            return;
          }
          if error.lock().ok().is_some_and(|guard| guard.is_some()) {
            return;
          }
          let index = next.fetch_add(1, Ordering::Relaxed);
          if index >= files.len() {
            return;
          }
          let file = &files[index];
          if let Ok(mut current) = current_file.lock() {
            *current = Some(file.name.clone());
          }
          match inspect_file(game_root, file, hashed_bytes, canceled) {
            Ok(true) => {}
            Ok(false) => {
              if let Ok(mut list) = mismatched.lock() {
                list.push(file.clone());
              }
            }
            Err(message) => {
              if let Ok(mut slot) = error.lock() {
                *slot = Some(message);
              }
              return;
            }
          }
        }
      });
    }
  });
  if let Some(message) = error.lock().map_err(|_| "完整性校验错误锁已损坏".to_string())?.take()
  {
    return Err(message);
  }
  let mut list = mismatched.lock().map_err(|_| "完整性校验结果锁已损坏".to_string())?.clone();
  list.sort_by(|left, right| left.name.cmp(&right.name));
  Ok(list)
}

fn inspect_file(
  game_root: &Path,
  file: &PlanFile,
  hashed_bytes: &AtomicU64,
  canceled: &AtomicBool,
) -> Result<bool, String> {
  match resolve_optional_manifest_file(game_root, &file.name)? {
    None => {
      hashed_bytes.fetch_add(file.size, Ordering::Relaxed);
      Ok(false)
    }
    Some(path) => hash_existing(&path, file, hashed_bytes, canceled),
  }
}

fn hash_existing(
  path: &Path,
  file: &PlanFile,
  hashed_bytes: &AtomicU64,
  canceled: &AtomicBool,
) -> Result<bool, String> {
  let metadata = fs::metadata(path).map_err(|error| format!("读取资源文件状态失败：{error}"))?;
  if metadata.len() != file.size {
    hashed_bytes.fetch_add(file.size, Ordering::Relaxed);
    return Ok(false);
  }
  let mut reader = open_sequential(path)?;
  let mut hasher = Md5::new();
  let mut buffer = vec![0_u8; HASH_BUFFER_SIZE];
  let mut consumed = 0_u64;
  loop {
    if canceled.load(Ordering::Acquire) {
      return Ok(true);
    }
    let read = reader.read(&mut buffer).map_err(|error| format!("读取资源文件失败：{error}"))?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
    let added = read as u64;
    consumed = consumed.saturating_add(added);
    hashed_bytes.fetch_add(added, Ordering::Relaxed);
  }
  if consumed < file.size {
    hashed_bytes.fetch_add(file.size.saturating_sub(consumed), Ordering::Relaxed);
  }
  Ok(format!("{:x}", hasher.finalize()).eq_ignore_ascii_case(&file.md5))
}

fn open_sequential(path: &Path) -> Result<File, String> {
  let mut options = OpenOptions::new();
  options.read(true);
  #[cfg(windows)]
  {
    use std::os::windows::fs::OpenOptionsExt;
    options.custom_flags(windows_sys::Win32::Storage::FileSystem::FILE_FLAG_SEQUENTIAL_SCAN);
  }
  options.open(path).map_err(|error| format!("打开资源文件失败：{error}"))
}

fn verify_concurrency() -> usize {
  std::thread::available_parallelism()
    .map(|value| value.get())
    .unwrap_or(MIN_CONCURRENCY)
    .clamp(MIN_CONCURRENCY, MAX_CONCURRENCY)
}

fn refresh_session(
  shared: &Arc<Mutex<VerifySession>>,
  cursor: usize,
  hashed_bytes: u64,
  mismatched: &[PlanFile],
  current_file: Option<String>,
  hashed_at_start: u64,
  baseline_elapsed: Duration,
  run_started: Instant,
) -> Result<(), String> {
  let mut session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  apply_progress(
    &mut session,
    hashed_bytes,
    current_file,
    hashed_at_start,
    baseline_elapsed,
    run_started,
  );
  session.cursor = cursor;
  session.completed_files = cursor;
  session.mismatched = mismatched.to_vec();
  Ok(())
}

fn touch_progress(
  shared: &Arc<Mutex<VerifySession>>,
  hashed_bytes: u64,
  current_file: Option<String>,
  hashed_at_start: u64,
  baseline_elapsed: Duration,
  run_started: Instant,
) -> Result<(), String> {
  let mut session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  apply_progress(
    &mut session,
    hashed_bytes,
    current_file,
    hashed_at_start,
    baseline_elapsed,
    run_started,
  );
  Ok(())
}

fn apply_progress(
  session: &mut VerifySession,
  hashed_bytes: u64,
  current_file: Option<String>,
  hashed_at_start: u64,
  baseline_elapsed: Duration,
  run_started: Instant,
) {
  let run_elapsed = run_started.elapsed();
  let run_ms = u64::try_from(run_elapsed.as_millis()).unwrap_or(u64::MAX);
  let hashed_this_run = hashed_bytes.saturating_sub(hashed_at_start);
  let seconds = run_elapsed.as_secs_f64().max(0.001);
  session.hashed_bytes = hashed_bytes;
  session.current_file = current_file;
  session.bytes_per_second = (hashed_this_run as f64 / seconds) as u64;
  let remaining = session.total_bytes.saturating_sub(hashed_bytes);
  session.eta_seconds =
    (session.bytes_per_second > 0).then_some(remaining / session.bytes_per_second.max(1));
  session.elapsed_ms =
    u64::try_from(baseline_elapsed.as_millis()).unwrap_or(u64::MAX).saturating_add(run_ms);
  session.touch();
}

fn persist_current(
  shared: &Arc<Mutex<VerifySession>>,
  task_root: &Path,
  dropped: &AtomicBool,
) -> Result<(), String> {
  let session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  if dropped.load(Ordering::Acquire) {
    return delete_session(task_root, &session.installation_id);
  }
  persist_session(task_root, &session)
}

fn emit_current(
  app_handle: &AppHandle,
  shared: &Arc<Mutex<VerifySession>>,
  run_started: Instant,
  dropped: &AtomicBool,
) -> Result<(), String> {
  if dropped.load(Ordering::Acquire) {
    return Ok(());
  }
  let session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  emit_verify(app_handle, &session.summary(run_started.elapsed()));
  Ok(())
}

fn finish_canceled(
  shared: &Arc<Mutex<VerifySession>>,
  task_root: &Path,
  app_handle: &AppHandle,
  dropped: &AtomicBool,
) -> Result<(), String> {
  let mut session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  if dropped.load(Ordering::Acquire) {
    return delete_session(task_root, &session.installation_id);
  }
  session.state = PackageVerifyState::Canceled;
  session.current_file = None;
  session.bytes_per_second = 0;
  session.eta_seconds = None;
  session.error_message = None;
  session.touch();
  persist_session(task_root, &session)?;
  emit_verify(app_handle, &session.summary(Duration::ZERO));
  Ok(())
}

fn finish_completed(
  shared: &Arc<Mutex<VerifySession>>,
  task_root: &Path,
  app_handle: &AppHandle,
  mismatched: Vec<PlanFile>,
  plan: Option<super::model::PackagePlanSummary>,
  dropped: &AtomicBool,
) -> Result<(), String> {
  let mut session = shared.lock().map_err(|_| "完整性校验会话锁已损坏".to_string())?;
  if dropped.load(Ordering::Acquire) {
    return delete_session(task_root, &session.installation_id);
  }
  session.state = PackageVerifyState::Completed;
  session.mismatched = mismatched;
  session.plan = plan;
  session.current_file = None;
  session.bytes_per_second = 0;
  session.eta_seconds = None;
  session.error_message = None;
  session.completed_files = session.total_files;
  session.hashed_bytes = session.total_bytes;
  session.cursor = session.total_files;
  session.touch();
  persist_session(task_root, &session)?;
  emit_verify(app_handle, &session.summary(Duration::ZERO));
  Ok(())
}

impl VerifySession {
  fn touch(&mut self) {
    self.updated_at = Utc::now().to_rfc3339();
  }
}

fn session_dir(task_root: &Path, installation_id: &str) -> PathBuf {
  task_root.join("verify").join(installation_id)
}

fn session_path(task_root: &Path, installation_id: &str) -> PathBuf {
  session_dir(task_root, installation_id).join("session.json")
}

fn delete_session(task_root: &Path, installation_id: &str) -> Result<(), String> {
  let path = session_path(task_root, installation_id);
  match fs::remove_file(&path) {
    Ok(()) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("清除完整性校验会话失败：{error}")),
  }
  let _ = fs::remove_dir(session_dir(task_root, installation_id));
  Ok(())
}

fn load_session(task_root: &Path, installation_id: &str) -> Result<Option<VerifySession>, String> {
  let path = session_path(task_root, installation_id);
  match fs::read(&path) {
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(error) => Err(format!("读取完整性校验会话失败：{error}")),
    Ok(bytes) => {
      if bytes.is_empty() || bytes.len() > MAX_SESSION_BYTES {
        return Err("完整性校验会话大小无效".to_string());
      }
      let session: VerifySession = serde_json::from_slice(&bytes)
        .map_err(|error| format!("解析完整性校验会话失败：{error}"))?;
      if session.schema_version != SESSION_SCHEMA_VERSION
        || session.installation_id != installation_id
      {
        return Err("完整性校验会话版本或身份不匹配".to_string());
      }
      Ok(Some(session))
    }
  }
}

fn persist_session(task_root: &Path, session: &VerifySession) -> Result<(), String> {
  let directory = session_dir(task_root, &session.installation_id);
  fs::create_dir_all(&directory).map_err(|error| format!("创建完整性校验会话目录失败：{error}"))?;
  let content = serde_json::to_vec_pretty(session)
    .map_err(|error| format!("序列化完整性校验会话失败：{error}"))?;
  if content.is_empty() || content.len() > MAX_SESSION_BYTES {
    return Err("完整性校验会话大小无效".to_string());
  }
  let target = directory.join("session.json");
  let temporary = directory.join("session.json.tmp");
  match fs::remove_file(&temporary) {
    Ok(()) => {}
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
    Err(error) => return Err(format!("清理旧完整性校验会话失败：{error}")),
  }
  let mut file = OpenOptions::new()
    .create_new(true)
    .write(true)
    .open(&temporary)
    .map_err(|error| format!("创建完整性校验会话临时文件失败：{error}"))?;
  file
    .write_all(&content)
    .and_then(|()| file.sync_all())
    .map_err(|error| format!("写入完整性校验会话失败：{error}"))?;
  drop(file);
  atomic_replace(&temporary, &target)
}

#[cfg(target_os = "windows")]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
  };
  let source = source.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let target = target.as_os_str().encode_wide().chain([0]).collect::<Vec<_>>();
  let result = unsafe {
    MoveFileExW(
      source.as_ptr(),
      target.as_ptr(),
      MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
    )
  };
  if result == 0 {
    return Err(format!("提交完整性校验会话失败：{}", std::io::Error::last_os_error()));
  }
  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn atomic_replace(source: &Path, target: &Path) -> Result<(), String> {
  fs::rename(source, target).map_err(|error| format!("提交完整性校验会话失败：{error}"))
}

fn emit_verify(app_handle: &AppHandle, summary: &PackageVerifySummary) {
  if let Err(error) = app_handle.emit("game-package://verify", summary) {
    log::warn!("[game-package] 发送完整性校验进度失败：{error}");
  }
}
