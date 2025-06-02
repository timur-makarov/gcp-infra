import si from "systeminformation";

interface SystemMetrics {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  last_updated_utc: string;
}

let systemMetrics: SystemMetrics;

function initializeMetrics(): void {
  systemMetrics = {
    cpu_usage_percent: 0.0,
    memory_usage_percent: 0.0,
    last_updated_utc: new Date().toISOString(),
  };
}

async function collectSystemMetrics(): Promise<void> {
  try {
    const [cpuData, memData]: [si.Systeminformation.CurrentLoadData, si.Systeminformation.MemData] =
      await Promise.all([si.currentLoad(), si.mem()]);

    const currentCPUUsage: number = cpuData.currentLoad;
    const currentMemoryUsage: number = (memData.used / memData.total) * 100;

    systemMetrics.cpu_usage_percent = parseFloat(currentCPUUsage.toFixed(2));
    systemMetrics.memory_usage_percent = parseFloat(currentMemoryUsage.toFixed(2));
    systemMetrics.last_updated_utc = new Date().toISOString();

    console.log(
      `📊 Metrics collected: CPU: ${systemMetrics.cpu_usage_percent}%, ` +
        `Memory: ${systemMetrics.memory_usage_percent}% ` +
        `at ${systemMetrics.last_updated_utc}`
    );
  } catch (error: any) {
    console.error(`⚠️ Error collecting system metrics: ${error.message}`);
  }
}

async function initializeAndStartCollector(): Promise<void> {
  initializeMetrics();
  console.log("🚀 Performing initial metrics collection...");
  await collectSystemMetrics();
  console.log("✅ Initial metrics collection complete.");

  setInterval(collectSystemMetrics, 15000);
  console.log("✅ Background metrics collector started.");
}

const port: number = 8080;

initializeAndStartCollector();

console.log(`⏳ Starting server on port ${port} (Bun Native HTTP + TypeScript)...`);
console.log(`👉 Metrics will be available at http://localhost:${port}/metrics`);

Bun.serve({
  port: port,
  fetch(req: Request): Response | Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/metrics") {
      return Response.json(systemMetrics);
    }

    return new Response("Not Found", { status: 404 });
  },
  error(error: Error): Response | Promise<Response> {
    console.error(`🚨 Bun server error: ${error.stack || error.message}`);
    return new Response("Internal Server Error", { status: 500 });
  },
});
