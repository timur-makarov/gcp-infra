# GCP Infrastructure for Observability pet-project

**What it will consist of?**

- Google Clound Provier
- Kubernetes with Helm
- 3 types of microservices in 3 diffirent languages
- PostgreSQL with 3 shards and a replica
- Prometheous and Grafana
- CI/CD pipelines for everything
- Simple backup system

Microservices will make lots of CRUD queries between each other and collect data about them.

**What is done already?**

- Created simple microservices and added discovery of Kubernetes services
- Created Helm charts for microservices

**What are the next steps?**

- Install PostgreSQL Helm chart
- Connect every microservice to the DB
- Create scalable architecture for every microservice
- Create first versions of the CRUD operations
