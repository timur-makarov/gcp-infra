import * as k8s from "@kubernetes/client-node";

export interface PortInfo {
  name: string;
  port: number;
  protocol: string;
  targetPort: number;
}

export interface DiscoveredServiceInfo {
  name: string;
  namespace: string;
  clusterIP: string;
  ports: PortInfo[];
  labels: Record<string, string>;
}

async function getKubeConfig(): Promise<k8s.KubeConfig> {
  const kc = new k8s.KubeConfig();

  try {
    // Try to load in-cluster config first
    kc.loadFromCluster();
    console.log("Using in-cluster Kubernetes config");
    return kc;
  } catch (err) {
    if (err instanceof Error && err.message.includes("not running in cluster")) {
      throw new Error(`Not running in cluster. Error: ${err.message}`);
    }
    throw err;
  }
}

async function discoverOtherMicroservices(
  k8sApi: k8s.CoreV1Api,
  namespace: string,
  labelSelector: string,
  myServiceName: string
): Promise<DiscoveredServiceInfo[]> {
  console.log(
    `Discovering services in namespace '${namespace}' with label selector '${labelSelector}'`
  );

  try {
    const response = await k8sApi.listNamespacedService({ namespace, labelSelector });

    const discoveredServices: DiscoveredServiceInfo[] = [];

    for (const service of response.items) {
      if (service.metadata?.name === "kubernetes") {
        continue;
      }

      if (service.metadata?.name === myServiceName) {
        console.log(`Skipping self: ${service.metadata.name}`);
        continue;
      }

      console.log(
        `Found service: ${service.metadata?.name} (Namespace: ${service.metadata?.namespace}, ClusterIP: ${service.spec?.clusterIP})`
      );

      const portsInfo: PortInfo[] = (service.spec?.ports || []).map((p: k8s.V1ServicePort) => ({
        name: p.name || "",
        port: p.port || 0,
        protocol: p.protocol || "",
        targetPort: typeof p.targetPort === "number" ? p.targetPort : 0,
      }));

      discoveredServices.push({
        name: service.metadata?.name || "",
        namespace: service.metadata?.namespace || "",
        clusterIP: service.spec?.clusterIP || "",
        ports: portsInfo,
        labels: service.metadata?.labels || {},
      });
    }

    return discoveredServices;
  } catch (err) {
    throw new Error(`Failed to list services in namespace ${namespace}: ${err}`);
  }
}

export async function getAvailableKuberServices(): Promise<DiscoveredServiceInfo[]> {
  const kc = await getKubeConfig();
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const namespace = process.env.NAMESPACE;
  if (!namespace) {
    throw new Error("NAMESPACE environment variable is not set");
  }
  console.log(`Operating in namespace: ${namespace}`);

  const myServiceName = process.env.SERVICE_NAME;
  const targetLabelSelector = process.env.DISCOVER_SERVICE_LABEL_SELECTOR || "";

  if (!targetLabelSelector) {
    console.log(
      "DISCOVER_SERVICE_LABEL_SELECTOR not set, discovering all services (except 'kubernetes')."
    );
  }

  if (!myServiceName) {
    throw new Error("SERVICE_NAME environment variable is not set");
  }

  try {
    const availableServices = await discoverOtherMicroservices(
      k8sApi,
      namespace,
      targetLabelSelector,
      myServiceName
    );

    if (availableServices.length > 0) {
      console.log("\nDynamically discovered microservices:");
      for (const svcInfo of availableServices) {
        console.log(`  - Name: ${svcInfo.name}`);
        console.log(`    Namespace: ${svcInfo.namespace}`);
        console.log(`    ClusterIP: ${svcInfo.clusterIP}`);
        console.log(`    Labels:`, svcInfo.labels);

        if (svcInfo.ports.length > 0) {
          console.log("    Ports:");
          for (const p of svcInfo.ports) {
            console.log(
              `      - Port: ${p.port}, Protocol: ${p.protocol}, TargetPort: ${p.targetPort}, Name: ${p.name}`
            );
          }

          const targetServicePort = svcInfo.ports[0]?.port;
          if (targetServicePort) {
            const serviceURL = `http://${svcInfo.name}.${svcInfo.namespace}.svc.cluster.local:${targetServicePort}/api/somepath`;
            console.log(`Example URL: ${serviceURL}`);
          }
        } else {
          console.log(`    Service ${svcInfo.name} has no ports defined.`);
        }
      }
    } else {
      console.log(
        `No services found with label selector '${targetLabelSelector}' in namespace '${namespace}'.`
      );
    }

    return availableServices;
  } catch (err) {
    console.error("Error discovering services:", err);
    throw err;
  }
}
