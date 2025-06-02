package infra

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type PortInfo struct {
	Name       string `json:"name"`
	Port       int32  `json:"port"`
	Protocol   string `json:"protocol"`
	TargetPort int32  `json:"targetPort"`
}

type DiscoveredServiceInfo struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	ClusterIP string            `json:"clusterIP"`
	Ports     []PortInfo        `json:"ports"`
	Labels    map[string]string `json:"labels"`
}

func getKubeConfig() (*rest.Config, error) {
	config, err := rest.InClusterConfig()
	if err == nil {
		fmt.Println("Using in-cluster Kubernetes config")
		return config, nil
	}

	if errors.Is(err, rest.ErrNotInCluster) {
		return nil, fmt.Errorf("Not running in cluster. Error: %v\n", err)
	}

	return config, nil
}

func discoverOtherMicroservices(clientset *kubernetes.Clientset, namespace, labelSelector, myServiceName string) ([]DiscoveredServiceInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("Discovering services in namespace '%s' with label selector '%s'\n", namespace, labelSelector)

	serviceList, err := clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list services in namespace %s: %w", namespace, err)
	}

	var discoveredServices []DiscoveredServiceInfo
	for _, service := range serviceList.Items {
		if service.Name == "kubernetes" {
			continue
		}

		if service.Name == myServiceName {
			fmt.Printf("Skipping self: %s\n", service.Name)
			continue
		}

		fmt.Printf("Found service: %s (Namespace: %s, ClusterIP: %s)\n", service.Name, service.Namespace, service.Spec.ClusterIP)

		var portsInfo []PortInfo
		for _, p := range service.Spec.Ports {
			portsInfo = append(portsInfo, PortInfo{
				Name:       p.Name,
				Port:       p.Port,
				Protocol:   string(p.Protocol),
				TargetPort: p.TargetPort.IntVal,
			})
		}

		discoveredServices = append(discoveredServices, DiscoveredServiceInfo{
			Name:      service.Name,
			Namespace: service.Namespace,
			ClusterIP: service.Spec.ClusterIP,
			Ports:     portsInfo,
			Labels:    service.Labels,
		})
	}

	return discoveredServices, nil
}

func GetAvailableKuberServices() []DiscoveredServiceInfo {
	config, err := getKubeConfig()
	if err != nil {
		fmt.Printf("Error getting Kubernetes config: %v\n", err)
		os.Exit(1)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		fmt.Printf("Error creating Kubernetes clientset: %v\n", err)
		os.Exit(1)
	}

	namespace := os.Getenv("NAMESPACE")
	if namespace == "" {
		fmt.Printf("Error getting current namespace: %v\n", err)
	}
	fmt.Printf("Operating in namespace: %s\n", namespace)

	myServiceName := os.Getenv("SERVICE_NAME")

	targetLabelSelector := os.Getenv("DISCOVER_SERVICE_LABEL_SELECTOR")
	if targetLabelSelector == "" {
		fmt.Println("DISCOVER_SERVICE_LABEL_SELECTOR not set, discovering all services (except 'kubernetes').")
	}

	availableServices, err := discoverOtherMicroservices(clientset, namespace, targetLabelSelector, myServiceName)
	if err != nil {
		fmt.Printf("Error discovering services: %v\n", err)
		os.Exit(1)
	}

	if len(availableServices) > 0 {
		fmt.Println("\nDynamically discovered microservices:")
		for _, svcInfo := range availableServices {
			fmt.Printf("  - Name: %s\n", svcInfo.Name)
			fmt.Printf("    Namespace: %s\n", svcInfo.Namespace)
			fmt.Printf("    ClusterIP: %s\n", svcInfo.ClusterIP)
			fmt.Printf("    Labels: %v\n", svcInfo.Labels)
			if len(svcInfo.Ports) > 0 {
				fmt.Printf("    Ports:\n")
				for _, p := range svcInfo.Ports {
					fmt.Printf("      - Port: %d, Protocol: %s, TargetPort: %d, Name: %s\n", p.Port, p.Protocol, p.TargetPort, p.Name)
				}

				targetServicePort := svcInfo.Ports[0].Port
				serviceURL := fmt.Sprintf("http://%s.%s.svc.cluster.local:%d/api/somepath", svcInfo.Name, svcInfo.Namespace, targetServicePort)
				fmt.Printf("Example URL: %s\n", serviceURL)
			} else {
				fmt.Printf("    Service %s has no ports defined.\n", svcInfo.Name)
			}
		}
	} else {
		fmt.Printf("No services found with label selector '%s' in namespace '%s'.\n", targetLabelSelector, namespace)
	}

	return availableServices
}
