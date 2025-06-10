# GCP Infrastructure for Observability pet-project

**What it will consist of?**

- Google Cloud Provider
- Kubernetes with Helm
- 3 types of microservices in 3 different languages
- PostgreSQL with 3 shards and a replica
- Prometheus and Grafana
- CI/CD pipelines for everything
- Simple backup system

Microservices will make lots of CRUD queries between each other and collect data about them.

**What is done already?**

- Created simple microservices and added discovery of Kubernetes services
- Created a Helm chart for all 3 types of microservices
- Installed PostgreSQL Helm chart and wrote a shell script for the one and only db migration
- Created the db architecture

**What are the next steps?**

- Connect every microservice to the DB
- Create scalable architecture for every microservice
- Create first versions of the CRUD operations
