# Guide Déploiement Prometheus & Grafana - AMS GLA

## Prérequis

- Cluster Kubernetes fonctionnel
- Namespace `ams-gla` déjà créé
- Application AMS GLA déployée

## Étape 1 : Installer prom-client

```bash
npm install prom-client --save
```

## Étape 2 : Ajouter endpoint /metrics dans server.js

Ajouter en haut du fichier :

```javascript
import promClient from 'prom-client';

// Créer registry
const register = new promClient.Registry();

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({ register });

// Métriques custom
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});
```

Ajouter le middleware :

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  next();
});
```

Ajouter l'endpoint :

```javascript
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Étape 3 : Déployer Prometheus

```bash
kubectl apply -f k8s/06-monitoring-prometheus.yaml
```

Vérifier :

```bash
kubectl get pods -n ams-gla | grep prometheus
kubectl logs -f deployment/prometheus -n ams-gla
```

## Étape 4 : Déployer Grafana

```bash
kubectl apply -f k8s/07-monitoring-grafana.yaml
```

Vérifier :

```bash
kubectl get pods -n ams-gla | grep grafana
kubectl get svc grafana -n ams-gla
```

## Étape 5 : Accéder à Grafana

```bash
# Port-forward
kubectl port-forward svc/grafana 3001:3000 -n ams-gla
```

Ouvrir : `http://localhost:3001`

**Credentials** :
- Username: `admin`
- Password: `admin`

## Étape 6 : Créer un Dashboard

1. Dans Grafana, aller à "Dashboards" → "New" → "New Dashboard"
2. Add Visualization
3. Sélectionner datasource "Prometheus"

### Requêtes PromQL utiles :

**Requêtes HTTP/sec** :
```promql
rate(http_request_duration_seconds_count[5m])
```

**Latence moyenne** :
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

**Latence P95** :
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Erreurs 5xx** :
```promql
rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])
```

**CPU Usage** :
```promql
process_cpu_seconds_total
```

**Memory Usage** :
```promql
process_resident_memory_bytes / 1024 / 1024
```

## Étape 7 : Importer Dashboard Préconfigur é (Optionnel)

Template Dashboard AMS GLA disponible dans `monitoring/grafana-dashboard.json`

Import :
1. Dashboards → New → Import
2. Upload JSON file
3. Sélectionner datasource Prometheus
4. Import

## Vérification

```bash
# Test endpoint metrics
curl http://localhost:3000/metrics

# Vérifier Prometheus targets
kubectl port-forward svc/prometheus 9090:9090 -n ams-gla
# http://localhost:9090/targets

# Accéder Grafana
kubectl port-forward svc/grafana 3001:3000 -n ams-gla
# http://localhost:3001
```

## Troubleshooting

**Prometheus ne scrappe pas les pods** :
- Vérifier que l'app expose `/metrics` sur port 3000
- Vérifier les labels des pods : `kubectl get pods -n ams-gla --show-labels`

**Grafana ne peut pas se connecter à Prometheus** :
- Vérifier le service : `kubectl get svc prometheus -n ams-gla`
- Tester la connexion : `kubectl exec -it deployment/grafana -n ams-gla -- wget -O- http://prometheus:9090/api/v1/status/targets`

**Pas de données dans Grafana** :
- Attendre 1-2 minutes pour que Prometheus collecte des données
- Vérifier que l'app reçoit des requêtes
- Tester manuellement : `curl http://localhost:3000/api/assets`

## Alerting (Optionnel)

Configurer des alertes dans Prometheus :

```yaml
# Ajouter dans prometheus.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - '/etc/prometheus/alerts.yml'
```

Exemple d'alerte :

```yaml
# alerts.yml
groups:
  - name: ams-gla
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
```

## Performance

**Ressources recommandées** :
- Prometheus : 256Mi-1Gi RAM, 100m-500m CPU
- Grafana : 128Mi-512Mi RAM, 100m-500m CPU

**Rétention** :
- Par défaut : 15 jours
- Modifier avec `--storage.tsdb.retention.time=30d`

## Nettoyage

```bash
kubectl delete -f k8s/07-monitoring-grafana.yaml
kubectl delete -f k8s/06-monitoring-prometheus.yaml
```
