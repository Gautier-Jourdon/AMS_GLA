# Guide de déploiement Kubernetes - AMS GLA

## Prérequis

1. **Cluster Kubernetes fonctionnel**
   - Minikube, Docker Desktop Kubernetes, ou cluster cloud (GKE, EKS, AKS)
   - `kubectl` configuré et connecté au cluster

2. **Outils nécessaires**
   - kubectl
   - Docker (pour build l'image)
   - Helm (optionnel, pour cert-manager)

## Étapes de déploiement

### 1. Construire l'image Docker

```bash
# Depuis le répertoire racine du projet
docker build -t ams-gla:latest .

# Si vous utilisez un registry privé
docker tag ams-gla:latest your-registry/ams-gla:latest
docker push your-registry/ams-gla:latest
```

### 2. Configurer les secrets

**IMPORTANT** : Modifiez le fichier `k8s/01-configmap-secrets.yaml` avec vos vraies valeurs :

```yaml
# Remplacez ces valeurs par vos vraies credentials :
stringData:
  PGPASSWORD: "votre-mot-de-passe-postgres"
  SUPABASE_KEY: "votre-clé-supabase"
  JWT_SECRET: "votre-secret-jwt-unique"
```

### 3. Déployer sur Kubernetes

```bash
# Se placer dans le dossier du projet
cd c:\Users\gauti\Desktop\AMS\Sujet_3\Code\AMS_GLA

# Appliquer tous les manifests dans l'ordre
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap-secrets.yaml
kubectl apply -f k8s/02-pvc.yaml
kubectl apply -f k8s/03-database.yaml

# Attendre que la base de données soit prête
kubectl wait --for=condition=ready pod -l app=supabase-db -n ams-gla --timeout=300s

# Déployer l'application
kubectl apply -f k8s/04-app-deployment.yaml
kubectl apply -f k8s/05-ingress.yaml
```

### 4. Vérifier le déploiement

```bash
# Voir tous les pods
kubectl get pods -n ams-gla

# Voir les services
kubectl get svc -n ams-gla

# Voir les logs de l'application
kubectl logs -f deployment/ams-gla-app -n ams-gla

# Voir les logs de la base de données
kubectl logs -f statefulset/supabase-db -n ams-gla
```

### 5. Initialiser la base de données

```bash
# Se connecter au pod PostgreSQL
kubectl exec -it supabase-db-0 -n ams-gla -- psql -U postgres -d postgres

# Puis exécuter le script SQL
\i /path/to/create_alerts_table.sql

# Ou copier le fichier dans le pod et l'exécuter
kubectl cp database/create_alerts_table.sql ams-gla/supabase-db-0:/tmp/
kubectl exec -it supabase-db-0 -n ams-gla -- psql -U postgres -d postgres -f /tmp/create_alerts_table.sql
```

### 6. Accéder à l'application

```bash
# Si vous utilisez LoadBalancer
kubectl get svc ams-gla-service -n ams-gla
# Accéder via l'IP externe

# Si vous utilisez Minikube
minikube service ams-gla-service -n ams-gla

# Si vous utilisez port-forward pour tester
kubectl port-forward svc/ams-gla-service 3000:80 -n ams-gla
# Puis ouvrir http://localhost:3000
```

## Configuration de l'Ingress (optionnel)

Si vous utilisez un Ingress Controller (nginx) :

```bash
# Installer nginx-ingress (si pas déjà installé)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Modifier k8s/05-ingress.yaml avec votre domaine
# Puis appliquer
kubectl apply -f k8s/05-ingress.yaml
```

## Scaling

```bash
# Scaler l'application
kubectl scale deployment ams-gla-app --replicas=5 -n ams-gla

# Activer l'autoscaling
kubectl autoscale deployment ams-gla-app --cpu-percent=70 --min=2 --max=10 -n ams-gla
```

## Mise à jour

```bash
# Mettre à jour l'image
kubectl set image deployment/ams-gla-app ams-gla=ams-gla:v2 -n ams-gla

# Ou réappliquer les manifests
kubectl apply -f k8s/04-app-deployment.yaml
```

## Monitoring

```bash
# Voir l'utilisation des ressources
kubectl top pods -n ams-gla
kubectl top nodes

# Voir les événements
kubectl get events -n ams-gla --sort-by='.lastTimestamp'
```

## Dépannage

```bash
# Voir les logs d'un pod spécifique
kubectl logs <pod-name> -n ams-gla

# Décrire un pod pour voir les erreurs
kubectl describe pod <pod-name> -n ams-gla

# Se connecter dans un pod
kubectl exec -it <pod-name> -n ams-gla -- /bin/bash

# Redémarrer un deployment
kubectl rollout restart deployment/ams-gla-app -n ams-gla
```

## Nettoyage

```bash
# Supprimer toute l'application
kubectl delete namespace ams-gla

# Ou supprimer individuellement
kubectl delete -f k8s/
```

## Notes importantes

1. **PersistentVolumes** : Les données PostgreSQL sont persistées. Vérifiez que votre cluster supporte le provisionnement dynamique de volumes.

2. **Secrets** : Ne commitez JAMAIS les secrets réels dans Git. Utilisez des outils comme Sealed Secrets ou External Secrets Operator en production.

3. **Images** : Mettez à jour l'image dans `04-app-deployment.yaml` avec votre registry réel.

4. **Domain** : Configurez un vrai nom de domaine dans `05-ingress.yaml` pour la production.

5. **Resources** : Ajustez les limites CPU/RAM selon vos besoins réels.
