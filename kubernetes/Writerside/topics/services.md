# Services

Services are used to expose pods to the network. In this case, we have three services defined: the (optional) Caddy pod, 
the Postgres database pod, and the Magic Frame app pod.

## Caddy pod service (optional)
The service for the Caddy pod is defined as follows.

Copy and past the below YAML code into a YAML file named ```magic-frame-caddy-service.yaml```
```
apiVersion: v1
kind: Service
metadata:
  labels:
    app: magic-frame-caddy
  name: magic-frame-caddy
  namespace: magic-frame
spec:
  type: NodePort
  ports:
    - name: "80"
      port: 80
      targetPort: 80
      # External app access (http): choose your own port
      nodePort: 30080 
    - name: "443"
      port: 443
      # External app access (https): choose your own port
      nodePort: 30443 
      targetPort: 443
    - name: 443-udp
      port: 443
      protocol: UDP
      targetPort: 443
    - name: "2019"
      port: 2019
      targetPort: 2019
  selector:
    app: magic-frame-caddy
```

## Database pod service
The service for the database pod is defined as follows.

Copy and past the below YAML code into a YAML file named ```magic-frame-db-service.yaml```

```
apiVersion: v1
kind: Service
metadata:
  labels:
    app: magic-frame-db
  name: magic-frame-db
  namespace: magic-frame
spec:
  type: ClusterIP
  ports:
    - name: db-port
      protocol: TCP
      port: 5432
      targetPort: 5432
  selector:
    app: magic-frame-db
```

## App pod service
The service for the app pod is defined as follows.

Copy and past the below YAML code into a YAML file named ```magic-frame-app-service.yaml```
```
apiVersion: v1
kind: Service
metadata:
  labels:
    app: magic-frame-app
  name: magic-frame-app
  namespace: magic-frame
spec:
  type: ClusterIP
  ports:
    - name: mf-port
      protocol: TCP
      port: 3000
      targetPort: 3000
  selector:
    app: magic-frame-app
```