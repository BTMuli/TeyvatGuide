/**
 * 请求限流工具
 * @since Beta v0.9.9
 */

/**
 * 限流器配置
 */
type RateLimiterConfig = {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 最大请求次数 */
  maxRequests: number;
};

/**
 * 限流器类
 * @since Beta v0.9.9
 */
class RateLimiter {
  private config: RateLimiterConfig;
  private requests: Array<number>;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.requests = [];
  }

  /**
   * 执行限流请求
   * @since Beta v0.9.9
   * @param fn - 要执行的异步函数
   * @returns 函数执行结果
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.wait();
    return fn();
  }

  /**
   * 等待直到可以发起请求
   * @since Beta v0.9.9
   */
  private async wait(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // 移除时间窗口外的请求记录
    this.requests = this.requests.filter((time) => time > windowStart);

    // 如果请求数已达上限，计算需要等待的时间
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.config.windowMs - now;

      if (waitTime > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
        // 重新计算时间窗口
        await this.wait();
        return;
      }
    }

    // 记录当前请求时间
    this.requests.push(Date.now());
  }

  /**
   * 获取当前窗口内的请求数
   * @since Beta v0.9.9
   * @returns 请求数
   */
  getRequestCount(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    return this.requests.filter((time) => time > windowStart).length;
  }

  /**
   * 重置限流器
   * @since Beta v0.9.9
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * 帖子详情请求限流器
 * 限制：1 分钟内最多 10 次请求
 * @since Beta v0.9.9
 */
export const postDetailRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 10, // 最多 10 次请求
});

export default RateLimiter;
