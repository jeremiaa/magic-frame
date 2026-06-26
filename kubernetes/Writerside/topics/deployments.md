# Deployments

Deployments are a way to manage and distribute your applications or services to different environments, such as 
development, staging, and production. They allow you to automate the process of releasing new features, bug fixes, 
and updates to your users. The containers, or pods, are deployed to a cluster of servers. The deployment process
typically creating a deployment configuration, and then deploying it to the target environment.

## Database Deployment
The database deployment is responsible for managing the database service in the cluster. It ensures that the database is
running and available for the application to use. The deployment configuration specifies the database image, the number
of replicas, and any necessary environment variables or configuration settings. The deployment will also handle scaling
the database up or down based on demand, and it will automatically restart any failed pods to ensure high availability.

Copy and past the below YAML code into a YAML file named ```magic-frame-db-deployment.yaml```
```
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: magic-frame-db
  name: magic-frame-db
  namespace: magic-frame
spec:
  replicas: 1
  selector:
    matchLabels:
      app: magic-frame-db
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: magic-frame-db
    spec:
      containers:
        - env:
            - name: POSTGRES_DB
              value: magicdashboard
            - name: POSTGRES_PASSWORD
              value: postgres
            - name: POSTGRES_USER
              value: postgres
          image: postgres:16-alpine
          livenessProbe:
            exec:
              command:
                - pg_isready -U postgres
            failureThreshold: 5
            periodSeconds: 5
            timeoutSeconds: 5
          name: magic-frame-db
          ports:
            - containerPort: 5432
              protocol: TCP
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: magic-frame-pgdata-pvc
      restartPolicy: Always
      volumes:
        - name: magic-frame-pgdata-pvc
          persistentVolumeClaim:
            claimName: magic-frame-pgdata-pvc

```

## Caddy Deployment (optional)
The Caddy deployment is responsible for managing the Caddy web server in the cluster.

Caddy is a powerful and easy-to-use web server that can be used to serve static files, reverse proxy to other services, 
and handle SSL/TLS termination. The deployment configuration for Caddy specifies the Caddy image, the number of replicas, 
and any necessary environment variables or configuration settings. The deployment will ensure that Caddy is running and 
available to serve requests from users, and it will automatically restart any failed pods to maintain high availability.

Copy and past the below YAML code into a YAML file named ```magic-frame-caddy-deployment.yaml```
```
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: magic-frame-caddy
  name: magic-frame-caddy
  namespace: magic-frame
spec:
  replicas: 1
  selector:
    matchLabels:
      app: magic-frame-caddy
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: magic-frame-caddy
    spec:
      containers:
        - image: ghcr.io/jeremiaa/magic-frame-caddy:latest
          name: magic-frame-caddy
          imagePullPolicy: Never
          ports:
            - containerPort: 80
              protocol: TCP
            - containerPort: 443
              protocol: TCP
            - containerPort: 443
              protocol: UDP
            - containerPort: 2019
              protocol: TCP
          volumeMounts:
            - mountPath: /etc/caddy
              name: magic-frame-caddy-config-pvc
            - mountPath: /data
              name: magic-frame-caddy-data-pvc
            - mountPath: /config
              name: magic-frame-caddy-config-pvc
      restartPolicy: Always
      volumes:
        - name: magic-frame-caddy-config-pvc
          persistentVolumeClaim:
            claimName: magic-frame-caddy-config-pvc
        - name: magic-frame-caddy-data-pvc
          persistentVolumeClaim:
            claimName: magic-frame-caddy-data-pvc
        - name: magic-frame-caddy-conf-pvc
          persistentVolumeClaim:
            claimName: magic-frame-caddy-conf-pvc
```
## Magic Frame App Deployment
The Magic Frame App deployment is responsible for managing the main application in the cluster. This deployment
configuration specifies the application image, the number of replicas, and any necessary environment variables or 
configuration settings. 

Copy and past the below YAML code into a YAML file named ```magic-frame-app-deployment.yaml```
```
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: magic-frame-app
  name: magic-frame-app
  namespace: magic-frame
spec:
  replicas: 1
  selector:
    matchLabels:
     app: magic-frame-app
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: magic-frame-app
    spec:
      containers:
        - env:
            - name: ADMIN_EMAIL
              valueFrom:
                configMapKeyRef:
                  key: ADMIN_EMAIL
                  name: magic-frame-env
            - name: ADMIN_PASSWORD
              valueFrom:
                configMapKeyRef:
                  key: ADMIN_PASSWORD
                  name: magic-frame-env
            - name: APP_BASE_URL
              valueFrom:
                configMapKeyRef:
                  key: APP_BASE_URL
                  name: magic-frame-env
            - name: CADDY_ADMIN_URL
              valueFrom:
                configMapKeyRef:
                  key: CADDY_ADMIN_URL
                  name: magic-frame-env
            - name: COOKIE_SECURE
              valueFrom:
                configMapKeyRef:
                  key: COOKIE_SECURE
                  name: magic-frame-env
            - name: DATABASE_URL
              valueFrom:
                configMapKeyRef:
                  key: DATABASE_URL
                  name: magic-frame-env
            - name: GOOGLE_CLIENT_ID
              valueFrom:
                configMapKeyRef:
                  key: GOOGLE_CLIENT_ID
                  name: magic-frame-env
            - name: GOOGLE_CLIENT_SECRET
              valueFrom:
                configMapKeyRef:
                  key: GOOGLE_CLIENT_SECRET
                  name: magic-frame-env
            - name: MS_CLIENT_ID
              valueFrom:
                configMapKeyRef:
                  key: MS_CLIENT_ID
                  name: magic-frame-env
            - name: MS_CLIENT_SECRET
              valueFrom:
                configMapKeyRef:
                  key: MS_CLIENT_SECRET
                  name: magic-frame-env
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  key: NODE_ENV
                  name: magic-frame-env
            - name: OPENWEATHERMAP_API_KEY
              valueFrom:
                configMapKeyRef:
                  key: OPENWEATHERMAP_API_KEY
                  name: magic-frame-env
            - name: SESSION_SECRET
              valueFrom:
                configMapKeyRef:
                  key: SESSION_SECRET
                  name: magic-frame-env
          image: ghcr.io/jeremiaa/magic-frame-app:latest
          name: magic-frame-app
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
              protocol: TCP
          volumeMounts:
            - mountPath: /app/configs
              name: magic-frame-configs-pvc
            - mountPath: /app/wallpapers
              name: magic-frame-wallpapers-pvc
#
# Uncomment the 2 lines below if you want to run and use Caddy
# Make sure the indentation is correct.
#
#            - mountPath: /caddy/config
#              name: magic-frame-caddy-config-pvc
      restartPolicy: Always
      volumes:
        - name: magic-frame-configs-pvc
          persistentVolumeClaim:
            claimName: magic-frame-configs-pvc
        - name: magic-frame-wallpapers-pvc
          persistentVolumeClaim:
            claimName: magic-frame-wallpapers-pvc
#
# Uncomment the 3 lines below if you want to run and use Caddy.
# Make sure the indentation is correct.
#
#        - name: magic-frame-caddy-config-pvc
#          persistentVolumeClaim:
#            claimName: magic-frame-caddy-config-pvc
---

apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    app: magic-frame-env
  name: magic-frame-env
  namespace: magic-frame
data:
  ADMIN_EMAIL: ""
  ADMIN_PASSWORD: ""
  APP_BASE_URL: ""
  CADDY_ADMIN_URL: "http://caddy:2019"
  COOKIE_SECURE: ""
  DATABASE_URL: "postgresql://postgres:postgres@magic-frame-db:5432/magicdashboard?schema=public"
  GOOGLE_CLIENT_ID: ""
  GOOGLE_CLIENT_SECRET: ""
  MS_CLIENT_ID: ""
  MS_CLIENT_SECRET: ""
  NODE_ENV: "production"
  OPENWEATHERMAP_API_KEY: ""
#
# Put the generated session secret between the quotes on the line below.
#
  SESSION_SECRET: "<paste session secret here>"



```