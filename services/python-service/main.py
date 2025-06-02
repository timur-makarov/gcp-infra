import threading
import time
import os
from datetime import datetime, timezone

import psutil
import uvicorn
from fastapi import FastAPI
from kubernetes_discovery import get_available_kubernetes_services

system_metrics = {}
metrics_lock = threading.RLock()

def initialize_metrics_globally():
    global system_metrics
    with metrics_lock:
        system_metrics["cpu_usage_percent"] = 0.0
        system_metrics["memory_usage_percent"] = 0.0
        system_metrics["last_updated_utc"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        system_metrics["available_services"] = get_available_kubernetes_services()

initialize_metrics_globally()

def collect_system_metrics():
    global system_metrics
    current_cpu_usage = psutil.cpu_percent(interval=1)
    vm_stat = psutil.virtual_memory()
    current_memory_usage = vm_stat.percent

    with metrics_lock:
        system_metrics["cpu_usage_percent"] = current_cpu_usage
        system_metrics["memory_usage_percent"] = current_memory_usage
        system_metrics["last_updated_utc"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    print(
        f"📊 Metrics collected: CPU: {system_metrics['cpu_usage_percent']:.2f}%, "
        f"Memory: {system_metrics['memory_usage_percent']:.2f}% "
        f"at {system_metrics['last_updated_utc']}"
    )

def metrics_collector_loop():
    while True:
        collect_system_metrics()
        time.sleep(15)

app = FastAPI()

@app.on_event("startup")
async def startup_event_tasks():
    print("🚀 Performing initial metrics collection...")
    collect_system_metrics()

    collector_thread = threading.Thread(target=metrics_collector_loop, daemon=True)
    collector_thread.start()
    print("✅ Background metrics collector started.")

@app.get("/metrics")
async def read_metrics():
    with metrics_lock:
        data_snapshot = dict(system_metrics)
    return data_snapshot

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8070"))
    print(f"✅ FastAPI Server starting...")
    print(f"👉 Metrics will be available at http://localhost:{port}/metrics")
    uvicorn.run(app, host="0.0.0.0", port=port)