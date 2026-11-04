//! 资源准备流水线的下载与组装双池名额调度。
//!
//! 下载名额与组装名额独立计数：需要下载的资源占用下载名额，下载完成进入组装时归还
//! 下载名额，调度器随即预取下一批资源；缓存命中的资源直接占用组装名额，组装名额占满
//! 时跳过该候选继续向后寻找可下载资源，避免下载被前面文件的组装挡住。总在途窗口仍由
//! 调用方的在途任务数上限约束，本模块只负责两个阶段各自的准入容量。
//! @since Beta v0.13.0

use std::sync::{
  Arc, Mutex,
  atomic::{AtomicBool, Ordering},
};
use tokio::sync::Notify;

/// 双池名额的共享计数状态。
///
/// [`PipelineStagePermit::mark_ready`] 与 [`PipelineStagePermit::mark_downloading`] 同步
/// 切换阶段，目标池占满时计数可能短暂超出容量；实际并发由组装信号量与下载焦点信号量
/// 约束，超出的部分只临时抬高对应阶段的准入门槛，随名额归还恢复。
///
/// @since Beta v0.13.0
struct PipelineSlotPool {
  assembly_capacity: usize,
  assembly_in_use: usize,
  download_capacity: usize,
  download_in_use: usize,
}

/// 下载/组装双池流水线调度器。
///
/// @since Beta v0.13.0
pub(super) struct PipelineScheduler {
  pool: Arc<Mutex<PipelineSlotPool>>,
  changed: Arc<Notify>,
}

/// 单个在途资源任务持有的阶段名额。
///
/// 名额随任务结束自动归还；下载完成进入组装前调用
/// [`PipelineStagePermit::mark_ready`] 归还下载名额，组装命中回退需要重新下载时调用
/// [`PipelineStagePermit::mark_downloading`] 归还组装名额并重新占用下载名额。
///
/// @since Beta v0.13.0
pub(super) struct PipelineStagePermit {
  pool: Arc<Mutex<PipelineSlotPool>>,
  changed: Arc<Notify>,
  /// 当前是否处于下载阶段；false 表示已进入组装阶段。读写都发生在名额池锁内。
  downloading: AtomicBool,
}

impl PipelineScheduler {
  /// 创建双池调度器。
  ///
  /// @since Beta v0.13.0
  ///
  /// # 参数
  /// - `assembly_capacity`: 组装名额上限，缓存命中资源的准入容量。
  /// - `download_capacity`: 下载名额上限，下载焦点加有界预取。
  pub(super) fn new(assembly_capacity: usize, download_capacity: usize) -> Self {
    Self {
      pool: Arc::new(Mutex::new(PipelineSlotPool {
        assembly_capacity,
        assembly_in_use: 0,
        download_capacity,
        download_in_use: 0,
      })),
      changed: Arc::new(Notify::new()),
    }
  }

  /// 按候选顺序预约第一个可调度的资源名额。
  ///
  /// 需要下载的候选占用下载名额；缓存命中的候选占用组装名额，组装名额占满时跳过
  /// 该候选继续向后寻找，保证组装繁忙时后面的可下载资源仍能预取。
  ///
  /// @since Beta v0.13.0
  ///
  /// # 参数
  /// - `candidates`: `(资源索引, 是否需要下载)` 候选序列。
  ///
  /// # 返回
  /// 第一个可调度候选的索引与其阶段名额；没有可调度候选时为 `None`。
  pub(super) fn try_reserve_next(
    &self,
    candidates: impl Iterator<Item = (usize, bool)>,
  ) -> Option<(usize, PipelineStagePermit)> {
    let mut pool = self.pool.lock().expect("流水线名额池锁已损坏");
    for (asset_index, needs_download) in candidates {
      if needs_download {
        if pool.download_in_use >= pool.download_capacity {
          continue;
        }
        pool.download_in_use = pool.download_in_use.saturating_add(1);
      } else {
        if pool.assembly_in_use >= pool.assembly_capacity {
          continue;
        }
        pool.assembly_in_use = pool.assembly_in_use.saturating_add(1);
      }
      let permit = PipelineStagePermit {
        pool: Arc::clone(&self.pool),
        changed: Arc::clone(&self.changed),
        downloading: AtomicBool::new(needs_download),
      };
      return Some((asset_index, permit));
    }
    None
  }

  /// 等待下一次名额变化：任一名额归还或阶段切换后返回，供调度循环重新预约。
  ///
  /// @since Beta v0.13.0
  pub(super) async fn changed(&self) {
    self.changed.notified().await;
  }
}

impl PipelineStagePermit {
  /// 下载完成进入组装：归还下载名额并占用组装名额。
  ///
  /// 已处于组装阶段时为空操作。组装名额占满时仍会计数，实际组装并发由组装信号量
  /// 约束，超出部分只临时抬高缓存准入门槛，随名额归还恢复。
  ///
  /// @since Beta v0.13.0
  pub(super) fn mark_ready(&self) {
    let mut pool = self.pool.lock().expect("流水线名额池锁已损坏");
    if !self.downloading.swap(false, Ordering::Relaxed) {
      return;
    }
    pool.download_in_use = pool.download_in_use.saturating_sub(1);
    pool.assembly_in_use = pool.assembly_in_use.saturating_add(1);
    drop(pool);
    self.changed.notify_one();
  }

  /// 组装命中回退、需要重新下载：归还组装名额并重新占用下载名额。
  ///
  /// 已处于下载阶段时为空操作。下载名额占满时仍会计数，实际下载并发由下载焦点
  /// 信号量约束，超出部分只临时抬高下载准入门槛，随名额归还恢复。
  ///
  /// @since Beta v0.13.0
  pub(super) fn mark_downloading(&self) {
    let mut pool = self.pool.lock().expect("流水线名额池锁已损坏");
    if self.downloading.swap(true, Ordering::Relaxed) {
      return;
    }
    pool.assembly_in_use = pool.assembly_in_use.saturating_sub(1);
    pool.download_in_use = pool.download_in_use.saturating_add(1);
    drop(pool);
    self.changed.notify_one();
  }

  /// 归还当前阶段占用的名额并唤醒调度循环。
  ///
  /// @since Beta v0.13.0
  fn release(&self) {
    let mut pool = self.pool.lock().expect("流水线名额池锁已损坏");
    if self.downloading.swap(false, Ordering::Relaxed) {
      pool.download_in_use = pool.download_in_use.saturating_sub(1);
    } else {
      pool.assembly_in_use = pool.assembly_in_use.saturating_sub(1);
    }
    drop(pool);
    self.changed.notify_one();
  }
}

impl Drop for PipelineStagePermit {
  /// 任务结束时按当前阶段归还名额。
  ///
  /// @since Beta v0.13.0
  fn drop(&mut self) {
    self.release();
  }
}

#[cfg(test)]
mod tests {
  use super::PipelineScheduler;
  use std::{sync::Arc, time::Duration};

  /// 创建不依赖外部线程的测试运行时。
  ///
  /// @since Beta v0.13.0
  fn runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_current_thread()
      .enable_all()
      .build()
      .expect("创建名额调度测试运行时失败")
  }

  /// 验证下载名额与组装名额独立计数，互不挤占。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn download_and_assembly_pools_count_independently() {
    let scheduler = PipelineScheduler::new(2, 2);
    let (_, first_download) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选 0 应可预约");
    let (_, second_download) =
      scheduler.try_reserve_next([(1, true)].into_iter()).expect("下载候选 1 应可预约");
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_none(),
      "下载名额占满后应拒绝第 3 路下载"
    );
    drop(first_download);
    drop(second_download);
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_some(),
      "下载名额归还后应恢复可预约"
    );

    let scheduler = PipelineScheduler::new(2, 2);
    let (_, first_cached) =
      scheduler.try_reserve_next([(0, false)].into_iter()).expect("缓存候选 0 应可预约");
    let (_, second_cached) =
      scheduler.try_reserve_next([(1, false)].into_iter()).expect("缓存候选 1 应可预约");
    assert!(
      scheduler.try_reserve_next([(2, false)].into_iter()).is_none(),
      "组装名额占满后应拒绝第 3 路缓存资源"
    );
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_some(),
      "组装名额占满不应影响下载名额"
    );
    drop(first_cached);
    drop(second_cached);
  }

  /// 验证下载完成进入组装时归还下载名额，调度器可以继续预取下一资源。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn mark_ready_releases_download_slot_for_next_prefetch() {
    let scheduler = PipelineScheduler::new(4, 1);
    let (index, permit) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("首个下载候选应可预约");
    assert_eq!(index, 0);
    assert!(
      scheduler.try_reserve_next([(1, true)].into_iter()).is_none(),
      "下载名额占满时后续下载应等待"
    );
    permit.mark_ready();
    let (next_index, _) =
      scheduler.try_reserve_next([(1, true)].into_iter()).expect("进入组装后应释放下载名额");
    assert_eq!(next_index, 1);
  }

  /// 验证组装名额占满时缓存候选被跳过，不阻塞后面的可下载资源预取。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn cached_candidates_are_skipped_while_assembly_is_busy() {
    let scheduler = PipelineScheduler::new(1, 1);
    let (cached_index, permit) =
      scheduler.try_reserve_next([(0, false)].into_iter()).expect("首个缓存候选应占用组装名额");
    assert_eq!(cached_index, 0);
    let (next_index, _) = scheduler
      .try_reserve_next([(1, false), (2, true), (3, false)].into_iter())
      .expect("组装占满时应跳过缓存候选继续寻找可下载资源");
    assert_eq!(next_index, 2, "组装占满时只有可下载候选可被预约");
    assert!(
      scheduler.try_reserve_next([(1, false), (3, false)].into_iter()).is_none(),
      "剩余缓存候选仍应被组装名额挡住"
    );
    drop(permit);
    let (released_index, _) =
      scheduler.try_reserve_next([(1, false)].into_iter()).expect("组装名额归还后缓存候选应可预约");
    assert_eq!(released_index, 1);
  }

  /// 验证组装命中回退时归还组装名额并重新占用下载名额。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn mark_downloading_returns_assembly_slot_and_reoccupies_download() {
    let scheduler = PipelineScheduler::new(1, 1);
    let (_, permit) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选应可预约");
    permit.mark_ready();
    assert!(
      scheduler.try_reserve_next([(1, false)].into_iter()).is_none(),
      "进入组装后组装名额应被占用"
    );
    permit.mark_downloading();
    let (_, fallback_cached) =
      scheduler.try_reserve_next([(1, false)].into_iter()).expect("回退下载应归还组装名额");
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_none(),
      "回退下载应重新占用下载名额"
    );
    permit.mark_ready();
    assert!(
      scheduler.try_reserve_next([(3, false)].into_iter()).is_none(),
      "回退组装应再次占用组装名额"
    );
    let (next_index, prefetch) =
      scheduler.try_reserve_next([(2, true)].into_iter()).expect("回退组装后下载名额应可再次预取");
    assert_eq!(next_index, 2);
    assert!(
      scheduler.try_reserve_next([(3, true)].into_iter()).is_none(),
      "最后一个下载名额应已被占用"
    );
    drop(prefetch);
    drop(permit);
    drop(fallback_cached);
    assert!(
      scheduler.try_reserve_next([(3, false)].into_iter()).is_some(),
      "名额全部归还后应恢复可预约"
    );
  }

  /// 验证缓存资源直接进入组装时 mark_ready 是空操作，不会重复计费。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn mark_ready_is_noop_for_cached_assembly_permit() {
    let scheduler = PipelineScheduler::new(2, 1);
    let (_, permit) =
      scheduler.try_reserve_next([(0, false)].into_iter()).expect("缓存候选应占用组装名额");
    permit.mark_ready();
    permit.mark_ready();
    assert!(
      scheduler.try_reserve_next([(1, false)].into_iter()).is_some(),
      "重复 mark_ready 不应抬升组装计数"
    );
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_some(),
      "重复 mark_ready 不应占用下载名额"
    );
  }

  /// 验证名额随任务结束自动归还当前阶段占用的容量。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn permit_drop_releases_current_stage_slot() {
    let scheduler = PipelineScheduler::new(1, 1);
    let (_, permit) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选应可预约");
    drop(permit);
    assert!(
      scheduler.try_reserve_next([(1, true)].into_iter()).is_some(),
      "下载阶段结束时应归还下载名额"
    );

    let scheduler = PipelineScheduler::new(1, 1);
    let (_, permit) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选应可预约");
    permit.mark_ready();
    drop(permit);
    assert!(
      scheduler.try_reserve_next([(1, false)].into_iter()).is_some(),
      "组装阶段结束时应归还组装名额"
    );
  }

  /// 验证组装占满时多个下载完成允许短暂超额计数，且随任务结束恢复准入。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn assembly_overshoot_recovers_after_permits_release() {
    let scheduler = PipelineScheduler::new(1, 2);
    let (_, first) =
      scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选 0 应可预约");
    let (_, second) =
      scheduler.try_reserve_next([(1, true)].into_iter()).expect("下载候选 1 应可预约");
    first.mark_ready();
    second.mark_ready();
    assert!(
      scheduler.try_reserve_next([(2, false)].into_iter()).is_none(),
      "组装超额期间缓存候选应被挡在门外"
    );
    assert!(
      scheduler.try_reserve_next([(2, true)].into_iter()).is_some(),
      "组装超额期间下载预取应继续可用"
    );
    drop(first);
    assert!(
      scheduler.try_reserve_next([(3, false)].into_iter()).is_none(),
      "仍有组装名额未归还，缓存候选不应恢复"
    );
    drop(second);
    assert!(
      scheduler.try_reserve_next([(3, false)].into_iter()).is_some(),
      "组装名额全部归还后缓存准入应恢复"
    );
  }

  /// 验证等待中的调度循环在名额归还时被唤醒。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn changed_wakes_waiting_loop_when_permit_releases() {
    let runtime = runtime();
    runtime.block_on(async {
      let scheduler = Arc::new(PipelineScheduler::new(1, 1));
      let (_, permit) =
        scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选应可预约");
      let waiter_scheduler = Arc::clone(&scheduler);
      let waiter = tokio::spawn(async move {
        tokio::time::timeout(Duration::from_secs(2), waiter_scheduler.changed()).await.is_ok()
      });
      tokio::task::yield_now().await;
      drop(permit);
      let woke = tokio::time::timeout(Duration::from_secs(2), waiter)
        .await
        .expect("等待调度唤醒任务超时")
        .expect("调度等待任务异常退出");
      assert!(woke, "名额释放后调度等待未在超时内唤醒");
    });
  }

  /// 验证等待创建前发生的变化会被保留，下一次等待立即返回。
  ///
  /// @since Beta v0.13.0
  #[test]
  fn changed_returns_immediately_for_release_before_wait() {
    let runtime = runtime();
    runtime.block_on(async {
      let scheduler = PipelineScheduler::new(1, 1);
      let (_, permit) =
        scheduler.try_reserve_next([(0, true)].into_iter()).expect("下载候选应可预约");
      drop(permit);
      let changed = scheduler.changed();
      tokio::pin!(changed);
      tokio::time::timeout(Duration::from_secs(2), changed)
        .await
        .expect("等待创建前的名额释放通知不应丢失");
    });
  }
}
