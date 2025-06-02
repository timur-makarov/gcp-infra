package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

var (
	systemMetrics map[string]interface{}
	metricsMutex  sync.RWMutex
)

func init() {
	systemMetrics = make(map[string]interface{})
	systemMetrics["cpu_usage_percent"] = 0.0
	systemMetrics["memory_usage_percent"] = 0.0
	systemMetrics["last_updated_utc"] = time.Now().UTC().Format(time.RFC3339)
	systemMetrics["kubernetes_pod_name"] = os.Getenv("MY_POD_NAME")
}

func collectSystemMetrics() {
	cpuPercentages, err := cpu.Percent(time.Second, false)
	currentCPUUsage := 0.0
	if err == nil && len(cpuPercentages) > 0 {
		currentCPUUsage = cpuPercentages[0]
	} else if err != nil {
		log.Printf("⚠️ Error getting CPU usage: %v. Using previous/default value.", err)
	}

	vmStat, err := mem.VirtualMemory()
	currentMemoryUsage := 0.0
	if err == nil && vmStat != nil {
		currentMemoryUsage = vmStat.UsedPercent
	} else if err != nil {
		log.Printf("⚠️ Error getting memory usage: %v. Using previous/default value.", err)
	}

	metricsMutex.Lock()
	defer metricsMutex.Unlock()

	systemMetrics["cpu_usage_percent"] = currentCPUUsage
	systemMetrics["memory_usage_percent"] = currentMemoryUsage
	systemMetrics["last_updated_utc"] = time.Now().UTC().Format(time.RFC3339)

	log.Printf(
		"📊 Metrics collected: CPU: %.2f%%, Memory: %.2f%% at %s",
		systemMetrics["cpu_usage_percent"],
		systemMetrics["memory_usage_percent"],
		systemMetrics["last_updated_utc"],
	)
}

func startMetricsCollector() {
	log.Println("🚀 Performing initial metrics collection...")
	collectSystemMetrics()

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			collectSystemMetrics()
		}
	}()
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
	metricsMutex.RLock()
	dataSnapshot := make(map[string]interface{})
	for key, value := range systemMetrics {
		dataSnapshot[key] = value
	}
	metricsMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(dataSnapshot); err != nil {
		log.Printf("🚨 Error encoding JSON response: %v", err)
	}
}

func main() {
	startMetricsCollector()

	http.HandleFunc("/metrics", metricsHandler)

	port := "8080"
	log.Printf("✅ Server starting on port %s...", port)
	log.Printf("👉 Metrics will be available at http://localhost:%s/metrics", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("💀 Failed to start server: %v", err)
	}
}
