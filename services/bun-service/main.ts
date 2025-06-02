import si from "systeminformation";
import { Elysia } from "elysia";
import { getAvailableKuberServices, type DiscoveredServiceInfo } from "./src/infra/kubernetes";

interface SystemMetrics {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  last_updated_utc: string;
  available_services: DiscoveredServiceInfo[];
}

let systemMetrics: SystemMetrics;

async function initializeMetrics(): Promise<void> {
  systemMetrics = {
    cpu_usage_percent: 0.0,
    memory_usage_percent: 0.0,
    last_updated_utc: new Date().toISOString(),
    available_services: await getAvailableKuberServices(),
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
  await initializeMetrics();
  console.log("🚀 Performing initial metrics collection...");
  await collectSystemMetrics();
  console.log("✅ Initial metrics collection complete.");

  setInterval(collectSystemMetrics, 15000);
  console.log("✅ Background metrics collector started.");
}

const port: number = parseInt(process.env.PORT || "8080", 10);

initializeAndStartCollector();

const app = new Elysia()
  .get("/metrics", () => systemMetrics)
  .onError(({ code, error }) => {
    console.error(`🚨 Server error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return new Response("Internal Server Error", { status: 500 });
  });

console.log(`⏳ Starting server on port ${port} (Elysia + Bun)...`);
console.log(`👉 Metrics will be available at http://localhost:${port}/metrics`);

app.listen(port);
