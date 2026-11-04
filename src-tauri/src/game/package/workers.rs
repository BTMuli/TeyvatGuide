//! 流水线任务与组装 worker 的生命周期登记、退出栅栏与恢复等待。
//! @since Beta v0.13.0

use std::{
  collections::HashMap,
  future::Future,
  sync::{
    Arc, LazyLock, Mutex,
    atomic::{AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::async_runtime::JoinHandle;
use tokio::{sync::Notify, task::JoinSet};

/// 一个计划下所有流水线任务与组装 worker 的退出状态。
///
/// @since Beta v0.13.0
struct PipelineWorkerSlot {
  active: AtomicUsize,
  finished: Notify,
}

/// 计划 ID 到流水线与组装生命周期槽位的登记表。
///
/// @since Beta v0.13.0
static PIPELINE_WORKER_SLOTS: LazyLock<Mutex<HashMap<String, Arc<PipelineWorkerSlot>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

/// 流水线任务或组装 worker 的 RAII 完成记账。
///
/// @since Beta v0.13.0
struct PipelineWorkerDoneGuard {
  slot: Arc<PipelineWorkerSlot>,
}

impl Drop for PipelineWorkerDoneGuard {
  /// 释放任务计数并唤醒等待中的 drain。
  ///
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    if self.slot.active.fetch_sub(1, Ordering::AcqRel) == 1 {
      self.slot.finished.notify_waiters();
    }
  }
}

/// 在登记表锁内预留一个流水线任务或组装 worker 计数。
///
/// @since Beta v0.13.0
fn register_worker(plan_id: &str) -> Arc<PipelineWorkerSlot> {
  let mut slots = PIPELINE_WORKER_SLOTS.lock().unwrap();
  let slot = Arc::clone(slots.entry(plan_id.to_string()).or_insert_with(|| {
    Arc::new(PipelineWorkerSlot { active: AtomicUsize::new(0), finished: Notify::new() })
  }));
  slot.active.fetch_add(1, Ordering::AcqRel);
  slot
}

/// 仅在登记表锁内删除仍属于当前 drain 的空闲槽位。
///
/// @since Beta v0.13.0
fn remove_idle_slot(plan_id: &str, slot: &Arc<PipelineWorkerSlot>) -> bool {
  let mut slots = PIPELINE_WORKER_SLOTS.lock().unwrap();
  let Some(current) = slots.get(plan_id) else {
    return true;
  };
  if !Arc::ptr_eq(current, slot) || slot.active.load(Ordering::Acquire) != 0 {
    return false;
  }
  slots.remove(plan_id);
  true
}

/// 读取当前计划槽位；调用方不持有登记表锁等待异步 worker。
///
/// @since Beta v0.13.0
fn current_slot(plan_id: &str) -> Option<Arc<PipelineWorkerSlot>> {
  PIPELINE_WORKER_SLOTS.lock().unwrap().get(plan_id).cloned()
}

/// 查询仍在运行或排队的流水线任务/组装 worker，供安装互斥决定是否可以释放。
/// @since Beta v0.13.0
pub(super) fn has_active_assembly_workers(plan_id: &str) -> bool {
  current_slot(plan_id).is_some_and(|slot| slot.active.load(Ordering::Acquire) != 0)
}

/// 登记并派生一个组装 worker。
///
/// RAII guard 在提交 blocking 任务前创建并移入闭包，因此任务成功、返回错误、panic、
/// 排队取消或句柄被丢弃时都会释放登记；丢弃 JoinHandle 本身不会提前减少 active 计数。
///
/// @since Beta v0.13.0
pub(super) fn spawn_assembly_worker<F, T>(plan_id: &str, job: F) -> JoinHandle<T>
where
  F: FnOnce() -> T + Send + 'static,
  T: Send + 'static,
{
  let guard = PipelineWorkerDoneGuard { slot: register_worker(plan_id) };
  tauri::async_runtime::spawn_blocking(move || {
    let _guard = guard;
    job()
  })
}

/// 登记并派生一个可独立推进的异步流水线任务。
///
/// 任务 guard 包住整个异步 future，因此父任务等待共享 journal 锁时，JoinSet 中的其他
/// 子任务仍可继续运行；任务被 abort 或 JoinSet 被丢弃时，guard 会在 future 实际退出时释放。
///
/// @since Beta v0.13.0
pub(super) fn spawn_pipeline_job<F, T>(jobs: &mut JoinSet<T>, plan_id: &str, future: F)
where
  F: Future<Output = T> + Send + 'static,
  T: Send + 'static,
{
  let guard = PipelineWorkerDoneGuard { slot: register_worker(plan_id) };
  jobs.spawn(async move {
    let _guard = guard;
    future.await
  });
}

/// 等待指定计划的全部异步流水线任务与组装 worker 退出。
///
/// 超时会保留槽位，避免下一轮恢复跳过等待；只有在同一登记表锁内确认槽位身份未变且
/// active 为零时才删除槽位。Notify 在检查 active 前创建，避免完成通知丢失。
///
/// @since Beta v0.13.0
pub(super) async fn drain_assembly_workers(plan_id: &str, timeout: Duration) -> bool {
  let now = Instant::now();
  let deadline = now.checked_add(timeout).unwrap_or(now);
  loop {
    let Some(slot) = current_slot(plan_id) else {
      return true;
    };
    let notified = slot.finished.notified();
    tokio::pin!(notified);
    notified.as_mut().enable();
    if slot.active.load(Ordering::Acquire) == 0 {
      if remove_idle_slot(plan_id, &slot) {
        return true;
      }
      continue;
    }
    let remaining = deadline.saturating_duration_since(Instant::now());
    if remaining.is_zero() {
      return false;
    }
    if tokio::time::timeout(remaining, notified).await.is_err() {
      return slot.active.load(Ordering::Acquire) == 0 && remove_idle_slot(plan_id, &slot);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::{drain_assembly_workers, spawn_assembly_worker, spawn_pipeline_job};
  use std::sync::{
    Arc,
    atomic::{AtomicU64, Ordering},
    mpsc::{self, Receiver, Sender},
  };
  use std::time::Duration;
  use tauri::async_runtime::JoinHandle;
  use tokio::{
    sync::{Mutex as AsyncMutex, oneshot},
    task::JoinSet,
  };

  static TEST_IDS: AtomicU64 = AtomicU64::new(0);

  /// 生成测试专用的唯一计划 ID。
  ///
  /// @since Beta v0.13.0
  fn test_plan_id() -> String {
    format!("workers-test-{}", TEST_IDS.fetch_add(1, Ordering::Relaxed))
  }

  /// 创建不依赖外部线程的测试运行时。
  ///
  /// @since Beta v0.13.0
  fn runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_current_thread()
      .enable_all()
      .build()
      .expect("创建 worker 生命周期测试运行时失败")
  }

  /// 创建带独立调度线程的测试运行时，避免同步 worker 反过来阻塞测试父任务。
  ///
  /// @since Beta v0.13.0
  fn multithread_runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_multi_thread()
      .worker_threads(2)
      .enable_all()
      .build()
      .expect("创建多线程 worker 生命周期测试运行时失败")
  }

  /// 在测试失败展开时释放阻塞 worker，避免遗留线程。
  ///
  /// @since Beta v0.13.0
  struct ReleaseOnDrop(Option<Sender<()>>);

  impl ReleaseOnDrop {
    /// 创建释放守卫。
    ///
    /// @since Beta v0.13.0
    fn new(sender: Sender<()>) -> Self {
      Self(Some(sender))
    }

    /// 立即释放阻塞 worker。
    ///
    /// @since Beta v0.13.0
    fn release(&mut self) {
      if let Some(sender) = self.0.take() {
        let _ = sender.send(());
      }
    }
  }

  impl Drop for ReleaseOnDrop {
    /// 在测试守卫离开作用域时释放阻塞 worker。
    ///
    /// @since Beta v0.13.0
    fn drop(&mut self) {
      self.release();
    }
  }

  /// 启动一个等待显式信号的组装 worker。
  ///
  /// @since Beta v0.13.0
  fn blocked_worker(plan_id: &str) -> (JoinHandle<()>, Receiver<()>, ReleaseOnDrop) {
    let (started_sender, started_receiver) = mpsc::channel();
    let (release_sender, release_receiver) = mpsc::channel();
    let release = ReleaseOnDrop::new(release_sender);
    let handle = spawn_assembly_worker(plan_id, move || {
      started_sender.send(()).expect("发送 worker 启动信号失败");
      release_receiver.recv().expect("等待 worker 释放信号失败");
    });
    (handle, started_receiver, release)
  }

  /// 验证同一计划的活跃 worker 会阻止 drain，其他计划不受影响。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn blocked_worker_keeps_same_plan_drained_false_and_other_plan_true() {
    let plan_id = test_plan_id();
    let other_plan_id = test_plan_id();
    let runtime = runtime();
    let (handle, started, mut release) = blocked_worker(&plan_id);
    started.recv_timeout(Duration::from_secs(2)).expect("worker 未启动");
    drop(handle);

    assert!(!runtime.block_on(drain_assembly_workers(&plan_id, Duration::ZERO)));
    assert!(runtime.block_on(drain_assembly_workers(&other_plan_id, Duration::ZERO)));

    release.release();
    assert!(runtime.block_on(drain_assembly_workers(&plan_id, Duration::from_secs(2))));
  }

  /// 验证取消等待不会删除仍活跃的计划槽位。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn aborting_drain_wait_does_not_remove_live_slot() {
    let plan_id = test_plan_id();
    let runtime = runtime();
    let (_handle, started, mut release) = blocked_worker(&plan_id);
    started.recv_timeout(Duration::from_secs(2)).expect("worker 未启动");

    runtime.block_on(async {
      let waiter_plan_id = plan_id.clone();
      let waiter = tokio::spawn(async move {
        drain_assembly_workers(&waiter_plan_id, Duration::from_secs(30)).await
      });
      tokio::task::yield_now().await;
      waiter.abort();
      let _ = waiter.await;
    });
    assert!(!runtime.block_on(drain_assembly_workers(&plan_id, Duration::ZERO)));

    release.release();
    assert!(runtime.block_on(drain_assembly_workers(&plan_id, Duration::from_secs(2))));
  }

  /// 验证正常错误和 panic 都会释放计划槽位。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn error_and_panic_workers_release_their_slots() {
    let error_plan_id = test_plan_id();
    let panic_plan_id = test_plan_id();
    let runtime = runtime();

    let error_worker = spawn_assembly_worker(&error_plan_id, || -> Result<(), &'static str> {
      Err("expected worker error")
    });
    assert!(matches!(runtime.block_on(error_worker), Ok(Err("expected worker error"))));
    assert!(runtime.block_on(drain_assembly_workers(&error_plan_id, Duration::ZERO)));

    let panic_worker = spawn_assembly_worker(&panic_plan_id, || -> () {
      panic!("expected worker panic");
    });
    assert!(runtime.block_on(panic_worker).is_err());
    assert!(runtime.block_on(drain_assembly_workers(&panic_plan_id, Duration::ZERO)));
  }

  /// 验证 JoinSet 子任务在父任务等待共享日志锁时仍能独立推进。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn pipeline_jobs_progress_while_parent_waits_for_shared_lock() {
    let plan_id = test_plan_id();
    let runtime = runtime();
    runtime.block_on(async {
      let journal = Arc::new(AsyncMutex::new(()));
      let (holder_ready_sender, holder_ready_receiver) = oneshot::channel();
      let (release_sender, release_receiver) = oneshot::channel();
      let holder_journal = Arc::clone(&journal);
      tokio::spawn(async move {
        let _guard = holder_journal.lock().await;
        holder_ready_sender.send(()).expect("发送共享锁占用信号失败");
        release_receiver.await.expect("等待共享锁释放信号失败");
      });
      holder_ready_receiver.await.expect("共享锁占用任务未启动");

      let (queued_sender, queued_receiver) = oneshot::channel();
      let mut jobs = JoinSet::new();
      let child_journal = Arc::clone(&journal);
      spawn_pipeline_job(&mut jobs, &plan_id, async move {
        queued_sender.send(()).expect("发送子任务排队信号失败");
        let _guard = child_journal.lock().await;
        "journal-child"
      });
      spawn_pipeline_job(&mut jobs, &plan_id, async move {
        queued_receiver.await.expect("等待子任务排队信号失败");
        "completed-child"
      });

      let completion = jobs.join_next().await.expect("JoinSet 未返回完成任务");
      assert_eq!(completion.expect("JoinSet 子任务异常退出"), "completed-child");
      let _ = release_sender.send(());
      let parent_guard = tokio::time::timeout(Duration::from_secs(2), journal.lock())
        .await
        .expect("父任务等待共享日志锁超时");
      drop(parent_guard);
      let child = jobs.join_next().await.expect("共享锁子任务未完成");
      assert_eq!(child.expect("共享锁子任务异常退出"), "journal-child");
      drop(jobs);
      assert!(drain_assembly_workers(&plan_id, Duration::ZERO).await);
    });
  }

  /// 验证 JoinSet 中止异步 wrapper 后，仍运行的组装 worker 继续受 drain 保护。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn pipeline_join_set_abort_keeps_blocking_worker_registered_until_exit() {
    let plan_id = test_plan_id();
    let runtime = multithread_runtime();
    let (started_sender, started_receiver) = oneshot::channel();
    let (release_sender, release_receiver) = mpsc::channel();
    let mut release = ReleaseOnDrop::new(release_sender);
    let drained_while_blocked = runtime.block_on(async {
      let mut jobs = JoinSet::new();
      let worker_plan_id = plan_id.clone();
      spawn_pipeline_job(&mut jobs, &plan_id, async move {
        let worker = spawn_assembly_worker(&worker_plan_id, move || {
          started_sender.send(()).expect("发送组装 worker 启动信号失败");
          release_receiver.recv().expect("等待组装 worker 释放信号失败");
        });
        worker.await.expect("组装 worker 异常退出");
      });
      tokio::time::timeout(Duration::from_secs(2), started_receiver)
        .await
        .expect("组装 worker 启动等待超时")
        .expect("组装 worker 启动信号丢失");
      jobs.abort_all();
      drop(jobs);
      drain_assembly_workers(&plan_id, Duration::ZERO).await
    });
    assert!(!drained_while_blocked);
    release.release();
    assert!(runtime.block_on(drain_assembly_workers(&plan_id, Duration::from_secs(2))));
  }

  /// 验证 wrapper 已进入同步临界区但尚未派生 blocking worker 时，丢弃 JoinSet 仍不能
  /// 让 drain 提前观察到空闲；wrapper 实际取消后才允许释放槽位。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn pipeline_wrapper_drop_before_blocking_spawn_keeps_slot_until_exit() {
    let plan_id = test_plan_id();
    let runtime = multithread_runtime();
    let (entered_sender, entered_receiver) = oneshot::channel();
    let (release_sender, release_receiver) = mpsc::channel();
    let mut release_wrapper = ReleaseOnDrop::new(release_sender);
    let (child_started_sender, child_started_receiver) = oneshot::channel();
    let (child_release_sender, child_release_receiver) = mpsc::channel();
    let mut release_child = ReleaseOnDrop::new(child_release_sender);
    let drained_while_wrapper_blocked = runtime.block_on(async {
      let mut jobs = JoinSet::new();
      let worker_plan_id = plan_id.clone();
      spawn_pipeline_job(&mut jobs, &plan_id, async move {
        entered_sender.send(()).expect("发送 wrapper 进入信号失败");
        release_receiver
          .recv_timeout(Duration::from_secs(2))
          .expect("等待 wrapper 同步临界区释放信号失败");
        let worker = spawn_assembly_worker(&worker_plan_id, move || {
          child_started_sender.send(()).expect("发送 blocking worker 启动信号失败");
          child_release_receiver.recv().expect("等待 blocking worker 释放信号失败");
        });
        worker.await.expect("blocking worker 异常退出");
      });
      tokio::time::timeout(Duration::from_secs(2), entered_receiver)
        .await
        .expect("wrapper 进入同步临界区等待超时")
        .expect("wrapper 进入信号丢失");
      drop(jobs);
      drain_assembly_workers(&plan_id, Duration::ZERO).await
    });
    assert!(!drained_while_wrapper_blocked);
    release_wrapper.release();
    runtime.block_on(async {
      tokio::time::timeout(Duration::from_secs(2), child_started_receiver)
        .await
        .expect("blocking worker 启动等待超时")
        .expect("blocking worker 启动信号丢失");
    });
    assert!(!runtime.block_on(drain_assembly_workers(&plan_id, Duration::ZERO)));
    release_child.release();
    assert!(runtime.block_on(drain_assembly_workers(&plan_id, Duration::from_secs(2))));
  }

  /// 验证异步流水线任务正常错误、panic 及未 poll 即 abort 都会释放登记。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn pipeline_jobs_release_slots_after_error_panic_and_unpolled_abort() {
    let error_plan_id = test_plan_id();
    let panic_plan_id = test_plan_id();
    let aborted_plan_id = test_plan_id();
    let runtime = runtime();
    runtime.block_on(async {
      let mut error_jobs = JoinSet::new();
      spawn_pipeline_job(&mut error_jobs, &error_plan_id, async {
        Err::<(), &'static str>("expected pipeline error")
      });
      let error = error_jobs.join_next().await.expect("错误任务未返回");
      assert!(matches!(error, Ok(Err("expected pipeline error"))));
      drop(error_jobs);
      assert!(drain_assembly_workers(&error_plan_id, Duration::ZERO).await);

      let mut panic_jobs = JoinSet::<()>::new();
      spawn_pipeline_job(&mut panic_jobs, &panic_plan_id, async {
        panic!("expected pipeline panic");
      });
      let panic = panic_jobs.join_next().await.expect("panic 任务未返回");
      assert!(panic.is_err());
      drop(panic_jobs);
      assert!(drain_assembly_workers(&panic_plan_id, Duration::ZERO).await);

      let mut aborted_jobs = JoinSet::new();
      spawn_pipeline_job(&mut aborted_jobs, &aborted_plan_id, std::future::pending::<()>());
      aborted_jobs.abort_all();
      drop(aborted_jobs);
      assert!(
        drain_assembly_workers(&aborted_plan_id, Duration::from_secs(2)).await,
        "未 poll 的 abort 任务泄漏了生命周期登记"
      );
    });
  }
}
