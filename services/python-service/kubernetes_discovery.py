from dataclasses import dataclass
from typing import Dict, List, Optional
import os
import sys
from kubernetes import client, config
from kubernetes.client.rest import ApiException

@dataclass
class PortInfo:
    name: str
    port: int
    protocol: str
    target_port: int

@dataclass
class DiscoveredServiceInfo:
    name: str
    namespace: str
    cluster_ip: str
    ports: List[PortInfo]
    labels: Dict[str, str]


def discover_other_microservices(
    v1: client.CoreV1Api,
    namespace: str,
    label_selector: str,
    my_service_name: str
) -> List[DiscoveredServiceInfo]:
    """Discover other microservices in the cluster."""
    print(f"Discovering services in namespace '{namespace}' with label selector '{label_selector}'")

    try:
        service_list = v1.list_namespaced_service(
            namespace=namespace,
            label_selector=label_selector
        )
    except ApiException as e:
        print(f"Failed to list services in namespace {namespace}: {e}")
        sys.exit(1)

    discovered_services = []
    for service in service_list.items:
        if service.metadata.name == "kubernetes":
            continue

        if service.metadata.name == my_service_name:
            print(f"Skipping self: {service.metadata.name}")
            continue

        print(f"Found service: {service.metadata.name} "
              f"(Namespace: {service.metadata.namespace}, "
              f"ClusterIP: {service.spec.cluster_ip})")

        ports_info = []
        for port in service.spec.ports:
            ports_info.append(PortInfo(
                name=port.name,
                port=port.port,
                protocol=port.protocol,
                target_port=port.target_port
            ))

        discovered_services.append(DiscoveredServiceInfo(
            name=service.metadata.name,
            namespace=service.metadata.namespace,
            cluster_ip=service.spec.cluster_ip,
            ports=ports_info,
            labels=service.metadata.labels
        ))

    return discovered_services


def get_available_kubernetes_services() -> List[DiscoveredServiceInfo]:
    """Main function to discover available Kubernetes services."""
    try:
        config.load_incluster_config()
        v1 = client.CoreV1Api()
    except Exception as e:
        print(f"Error creating Kubernetes client: {e}")
        sys.exit(1)

    namespace = os.getenv("NAMESPACE")
    if not namespace:
        print("Error: NAMESPACE environment variable not set")
        sys.exit(1)
    print(f"Operating in namespace: {namespace}")

    my_service_name = os.getenv("SERVICE_NAME")
    target_label_selector = os.getenv("DISCOVER_SERVICE_LABEL_SELECTOR", "")
    
    if not target_label_selector:
        print("DISCOVER_SERVICE_LABEL_SELECTOR not set, discovering all services (except 'kubernetes').")

    available_services = discover_other_microservices(
        v1, namespace, target_label_selector, my_service_name
    )

    if available_services:
        print("\nDynamically discovered microservices:")
        for svc_info in available_services:
            print(f"  - Name: {svc_info.name}")
            print(f"    Namespace: {svc_info.namespace}")
            print(f"    ClusterIP: {svc_info.cluster_ip}")
            print(f"    Labels: {svc_info.labels}")
            
            if svc_info.ports:
                print("    Ports:")
                for port in svc_info.ports:
                    print(f"      - Port: {port.port}, Protocol: {port.protocol}, "
                          f"TargetPort: {port.target_port}, Name: {port.name}")
                
                target_service_port = svc_info.ports[0].port
                service_url = (f"http://{svc_info.name}.{svc_info.namespace}.svc.cluster.local:"
                             f"{target_service_port}/api/somepath")
                print(f"Example URL: {service_url}")
            else:
                print(f"    Service {svc_info.name} has no ports defined.")
    else:
        print(f"No services found with label selector '{target_label_selector}' "
              f"in namespace '{namespace}'.")

    return available_services
