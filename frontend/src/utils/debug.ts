// Debug utilities for AR development

export interface DebugInfo {
  frameRate: number;
  objectCount: number;
  networkLatency: number;
  trackingQuality: string;
}

export class ARDebugger {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private frameRate = 0;
  private networkLatency = 0;
  private lastNetworkMessageTime = 0;

  updateFrameRate(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= 1000) {
      this.frameRate = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  recordNetworkMessage(): void {
    const now = performance.now();
    if (this.lastNetworkMessageTime > 0) {
      this.networkLatency = now - this.lastNetworkMessageTime;
    }
    this.lastNetworkMessageTime = now;
  }

  getDebugInfo(objectCount: number, trackingQuality: string): DebugInfo {
    return {
      frameRate: this.frameRate,
      objectCount,
      networkLatency: this.networkLatency,
      trackingQuality,
    };
  }

  logDebugInfo(info: DebugInfo): void {
    console.log(`[AR Debug] FPS: ${info.frameRate}, Objects: ${info.objectCount}, Latency: ${info.networkLatency}ms, Tracking: ${info.trackingQuality}`);
  }
}

// Export singleton instance
export const arDebugger = new ARDebugger();
