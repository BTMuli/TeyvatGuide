//! 资源任务事件的合并派发、修订号屏障与进度节流。
//! @since Beta v0.13.0

use crate::game::model::PackageTaskSummary;
use std::{
  collections::HashMap,
  sync::{
    Arc, LazyLock, Mutex,
    mpsc::{SyncSender, sync_channel},
  },
  time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};

const UI_PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(150);
const UI_PROGRESS_EMIT_SLOT_TTL: Duration = Duration::from_secs(60);

/// 合并后的任务快照；状态通知标志不会被随后的进度更新清除。
/// @since Beta v0.13.0
struct TaskEvent {
  summary: PackageTaskSummary,
  emit_state: bool,
}

/// 每个任务派发器的单槽事件队列；排空后仍保留修订号屏障。
/// @since Beta v0.13.0
#[derive(Default)]
struct PendingTaskEvents {
  revision_floor: u64,
  event: Option<TaskEvent>,
}

impl PendingTaskEvents {
  /// 合并快照，拒绝比已经接受的快照更旧的修订号。
  /// @since Beta v0.13.0
  fn publish(&mut self, summary: PackageTaskSummary, emit_state: bool) -> bool {
    if summary.revision < self.revision_floor {
      return false;
    }
    self.revision_floor = summary.revision;
    let emit_state = emit_state || self.event.as_ref().is_some_and(|event| event.emit_state);
    self.event = Some(TaskEvent { summary, emit_state });
    true
  }

  /// 取走事件而不重置已接受修订号，防止迟到事件在排空后倒灌。
  /// @since Beta v0.13.0
  fn take(&mut self) -> Option<TaskEvent> {
    self.event.take()
  }
}

/// 下载与安装共用的后台单槽派发器；发布者不会等待 WebView 消费事件。
/// @since Beta v0.13.0
#[derive(Clone)]
pub(super) struct TaskEventDispatcher {
  pending: Arc<Mutex<PendingTaskEvents>>,
  wake: SyncSender<()>,
}

impl TaskEventDispatcher {
  /// 创建配音准备阶段的事件边界。
  /// @since Beta v0.13.0
  pub(super) fn for_audio(app_handle: AppHandle, task_id: &str) -> Result<Self, String> {
    Self::new(
      app_handle,
      format!("tg-audio-events-{}", task_id.chars().take(8).collect::<String>()),
    )
  }

  /// 创建全新安装阶段的事件边界。
  /// @since Beta v0.13.0
  pub(super) fn for_install(app_handle: AppHandle, task_id: &str) -> Result<Self, String> {
    Self::new(
      app_handle,
      format!("tg-install-events-{}", task_id.chars().take(8).collect::<String>()),
    )
  }

  /// 把后台快照交付给应用事件系统。
  /// @since Beta v0.13.0
  fn new(app_handle: AppHandle, thread_name: String) -> Result<Self, String> {
    Self::with_sink(thread_name, move |event| {
      if event.emit_state {
        emit_state(&app_handle, &event.summary);
      }
      emit_progress(&app_handle, &event.summary);
    })
  }

  /// 创建派发线程；最后一个发送端释放后仍排空已接受的最终事件。
  /// @since Beta v0.13.0
  fn with_sink<F>(thread_name: String, mut sink: F) -> Result<Self, String>
  where
    F: FnMut(TaskEvent) + Send + 'static,
  {
    let pending = Arc::new(Mutex::new(PendingTaskEvents::default()));
    let worker_pending = Arc::clone(&pending);
    let (wake, receiver) = sync_channel(1);
    std::thread::Builder::new()
      .name(thread_name)
      .spawn(move || {
        let mut drain = || loop {
          let event = match worker_pending.lock() {
            Ok(mut pending) => pending.take(),
            Err(_) => return,
          };
          match event {
            Some(event) => sink(event),
            None => break,
          }
        };
        while receiver.recv().is_ok() {
          drain();
        }
        drain();
      })
      .map_err(|error| format!("创建资源任务事件派发线程失败：{error}"))?;
    Ok(Self { pending, wake })
  }

  /// 发布进度；同槽内尚未消费的状态通知会随新快照保留。
  /// @since Beta v0.13.0
  pub(super) fn publish_progress(&self, summary: PackageTaskSummary) {
    self.publish(summary, false);
  }

  /// 发布生命周期状态及其完整快照。
  /// @since Beta v0.13.0
  pub(super) fn publish_state(&self, summary: PackageTaskSummary) {
    self.publish(summary, true);
  }

  /// 只在单槽接受快照后唤醒派发线程。
  /// @since Beta v0.13.0
  fn publish(&self, summary: PackageTaskSummary, emit_state: bool) {
    let Ok(mut pending) = self.pending.lock() else {
      return;
    };
    if !pending.publish(summary, emit_state) {
      return;
    }
    drop(pending);
    let _ = self.wake.try_send(());
  }
}

/// 按任务隔离的进度发布时钟。
/// @since Beta v0.13.0
#[derive(Default)]
struct ProgressEmitRegistry {
  slots: HashMap<String, Instant>,
}

impl ProgressEmitRegistry {
  /// 丢弃长时间未发布的任务槽。
  /// @since Beta v0.13.0
  fn prune(&mut self, now: Instant) {
    self.slots.retain(|_, last| now.saturating_duration_since(*last) < UI_PROGRESS_EMIT_SLOT_TTL);
  }

  /// 记录一次实际发布，用于约束后续进度频率。
  /// @since Beta v0.13.0
  fn remember(&mut self, task_id: &str, now: Instant) {
    self.prune(now);
    self.slots.insert(task_id.to_string(), now);
  }

  /// 判断当前时间是否允许发布，并占用本次发布窗口。
  /// @since Beta v0.13.0
  fn reserve(&mut self, task_id: &str, now: Instant) -> bool {
    self.prune(now);
    if self
      .slots
      .get(task_id)
      .is_some_and(|last| now.saturating_duration_since(*last) < UI_PROGRESS_EMIT_INTERVAL)
    {
      return false;
    }
    self.slots.insert(task_id.to_string(), now);
    true
  }
}

static PROGRESS_EMIT_REGISTRY: LazyLock<Mutex<ProgressEmitRegistry>> =
  LazyLock::new(|| Mutex::new(ProgressEmitRegistry::default()));

/// 发布生命周期事件；发送失败写入诊断日志。
/// @since Beta v0.13.0
pub(super) fn emit_state(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Err(error) = app_handle.emit("game-package://state", summary) {
    log::warn!("[game-package] 发送任务状态事件失败：{error}");
  }
}

/// 发布进度并更新对应任务的发布时钟。
/// @since Beta v0.13.0
pub(super) fn emit_progress(app_handle: &AppHandle, summary: &PackageTaskSummary) {
  if let Ok(mut registry) = PROGRESS_EMIT_REGISTRY.lock() {
    registry.remember(&summary.task_id, Instant::now());
  }
  if let Err(error) = app_handle.emit("game-package://progress", summary) {
    log::warn!("[game-package] 发送任务进度事件失败：{error}");
  }
}

/// 为前台节流调用保留一次发布机会。
/// @since Beta v0.13.0
pub(super) fn should_emit_progress(task_id: &str) -> bool {
  PROGRESS_EMIT_REGISTRY
    .lock()
    .map_or(true, |mut registry| registry.reserve(task_id, Instant::now()))
}

#[cfg(test)]
mod tests {
  use super::{PendingTaskEvents, ProgressEmitRegistry, TaskEventDispatcher};
  use crate::game::{
    journal::TaskJournal,
    model::{PackageTaskSummary, SchemeId},
  };
  use std::{
    sync::mpsc::channel,
    time::{Duration, Instant},
  };
  use uuid::Uuid;

  /// 用真实日志投影构造事件载荷。
  /// @since Beta v0.13.0
  fn summary(revision: u64) -> PackageTaskSummary {
    let mut journal = TaskJournal::from_switch(
      Uuid::nil().to_string(),
      "test-install".to_string(),
      SchemeId::CnOfficial,
      SchemeId::CnBilibili,
      "a".repeat(64),
      0,
      0,
    );
    journal.revision = revision;
    journal.summary()
  }

  /// 新进度不丢失待发布的状态标志，且低修订号不能取代已排队的快照。
  /// @since Beta v0.13.0
  #[test]
  fn progress_coalescing_preserves_state_and_newest_revision() {
    let mut pending = PendingTaskEvents::default();
    assert!(pending.publish(summary(2), true));
    assert!(pending.publish(summary(3), false));
    assert!(!pending.publish(summary(1), false));
    let event = pending.take().unwrap();
    assert_eq!(event.summary.revision, 3);
    assert!(event.emit_state);
  }

  /// 队列排空后仍拒绝旧修订号；相同修订号的增量进度仍可发布。
  /// @since Beta v0.13.0
  #[test]
  fn drained_queue_keeps_revision_floor() {
    let mut pending = PendingTaskEvents::default();
    pending.publish(summary(10), true);
    pending.take().unwrap();
    assert!(!pending.publish(summary(2), false));
    assert!(pending.take().is_none());
    assert!(pending.publish(summary(10), false));
    assert_eq!(pending.take().unwrap().summary.revision, 10);
  }

  /// 最后一个发送端销毁后仍能收到已经发布的最终状态。
  /// @since Beta v0.13.0
  #[test]
  fn dropping_dispatcher_drains_final_state() {
    let (sender, receiver) = channel();
    let dispatcher = TaskEventDispatcher::with_sink("tg-event-test".to_string(), move |event| {
      sender.send(event).unwrap();
    })
    .unwrap();
    dispatcher.publish_state(summary(7));
    drop(dispatcher);
    let event = receiver.recv_timeout(Duration::from_secs(2)).unwrap();
    assert_eq!(event.summary.revision, 7);
    assert!(event.emit_state);
  }

  /// 节流按安装任务隔离，并会回收过期槽而不依赖真实等待。
  /// @since Beta v0.13.0
  #[test]
  fn progress_throttle_is_per_task_and_expires() {
    let now = Instant::now();
    let mut registry = ProgressEmitRegistry::default();
    assert!(registry.reserve("one", now));
    assert!(!registry.reserve("one", now + Duration::from_millis(100)));
    assert!(registry.reserve("two", now + Duration::from_millis(100)));
    assert!(registry.reserve("one", now + Duration::from_millis(150)));
    registry.prune(now + Duration::from_secs(61));
    assert!(registry.slots.is_empty());
  }
}
