//! 组装 worker 的生命周期登记、退出栅栏与恢复等待。
//! @since Beta v0.13.0

use std::{
  collections::HashMap,
  sync::{
    Arc, LazyLock, Mutex,
    atomic::{AtomicUsize, Ordering},
  },
  time::{Duration, Instant},
};
use tauri::async_runtime::JoinHandle;
use tokio::sync::Notify;

/// 一个计划下所有组装 worker 的退出状态。
///
/// @since Beta v0.13.0
struct AssemblyWorkerSlot {
  active: AtomicUsize,
  finished: Notify,
}

/// 计划 ID 到组装生命周期槽位的登记表。
///
/// @since Beta v0.13.0
static ASSEMBLY_WORKER_SLOTS: LazyLock<Mutex<HashMap<String, Arc<AssemblyWorkerSlot>>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

/// 组装 worker 的 RAII 完成记账。
///
/// @since Beta v0.13.0
struct AssemblyWorkerDoneGuard {
  slot: Arc<AssemblyWorkerSlot>,
}

impl Drop for AssemblyWorkerDoneGuard {
  /// 释放 worker 计数并唤醒等待中的 drain。
  ///
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    if self.slot.active.fetch_sub(1, Ordering::AcqRel) == 1 {
      self.slot.finished.notify_waiters();
    }
  }
}

/// 在登记表锁内预留一个 worker 计数。
///
/// @since Beta v0.13.0
fn register_worker(plan_id: &str) -> Arc<AssemblyWorkerSlot> {
  let mut slots = ASSEMBLY_WORKER_SLOTS.lock().unwrap();
  let slot = Arc::clone(slots.entry(plan_id.to_string()).or_insert_with(|| {
    Arc::new(AssemblyWorkerSlot { active: AtomicUsize::new(0), finished: Notify::new() })
  }));
  slot.active.fetch_add(1, Ordering::AcqRel);
  slot
}

/// 仅在登记表锁内删除仍属于当前 drain 的空闲槽位。
///
/// @since Beta v0.13.0
fn remove_idle_slot(plan_id: &str, slot: &Arc<AssemblyWorkerSlot>) -> bool {
  let mut slots = ASSEMBLY_WORKER_SLOTS.lock().unwrap();
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
fn current_slot(plan_id: &str) -> Option<Arc<AssemblyWorkerSlot>> {
  ASSEMBLY_WORKER_SLOTS.lock().unwrap().get(plan_id).cloned()
}

/// 查询仍在运行或排队的组装 worker，供安装互斥决定是否可以释放。
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
  let guard = AssemblyWorkerDoneGuard { slot: register_worker(plan_id) };
  tauri::async_runtime::spawn_blocking(move || {
    let _guard = guard;
    job()
  })
}

/// 等待指定计划的全部组装 worker 退出。
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
  use super::{drain_assembly_workers, spawn_assembly_worker};
  use std::sync::{
    atomic::{AtomicU64, Ordering},
    mpsc::{self, Receiver, Sender},
  };
  use std::time::Duration;
  use tauri::async_runtime::JoinHandle;

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
}
