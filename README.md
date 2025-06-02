# GCP Infrastructure for Observability pet-project

**What it will consist of?**

- Google Clound Provier
- Kubernetes with Helm
- 3 types of microservices in 3 diffirent languages
- PostgreSQL RDMS with 3 shards and a replica
- Prometheous and Grafana
- Backup System

Microservices will make lots of CRUD queries between each other and collect data about them.

**What is done already?**

- Created simple microservices and added discovery of Kubernetes services
- Created Helm charts for microservices
