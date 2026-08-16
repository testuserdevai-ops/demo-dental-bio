export function createLatestTaskQueue<T>(run: (value: T) => Promise<boolean>) {
  let queued: { value: T } | null = null;
  let running: Promise<boolean> | null = null;

  function start() {
    if (running) return running;

    const loop = (async () => {
      while (queued) {
        const next = queued.value;
        queued = null;
        if (!(await run(next))) return false;
      }
      return true;
    })();
    running = loop;
    void loop.finally(() => {
      if (running === loop) running = null;
    });
    return loop;
  }

  return {
    enqueue(value: T) {
      queued = { value };
      return start();
    },
    async flush() {
      while (running || queued) {
        if (!(await (running ?? start()))) return false;
      }
      return true;
    },
    hasPending() {
      return Boolean(running || queued);
    },
  };
}
