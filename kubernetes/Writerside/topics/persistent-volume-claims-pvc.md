# Persistent Volume Claims (PVC)

Persistent Volume Claims (PVCs) are a way for users to request storage resources in a Kubernetes cluster. They allow 
users to abstract the underlying storage infrastructure and request storage without needing to know the details of how 
it is provisioned.

In K3S with Rancher , PVCs are used to manage storage for applications running in the cluster. When a PVC is created, 
it is bound to a Persistent Volume (PV) that provides the actual storage. The PV can be backed by various storage 
providers, such as local disks, NFS, or cloud storage services.

As an example; in this setup, we are creating a PVC named `magic-frame-caddy-conf-pvc` in the `magic-frame` namespace. 
The PVC is requesting 100Mi of storage and is using the `magic-frame-storage` storage class. The access mode is set to 
`ReadWriteOnce`, which means that the volume can be mounted as read-write by a single node.

When this PVC is created, Kubernetes will look for a PV that matches the requested storage and access mode. If a 
suitable PV is found, it will be bound to the PVC, and the application can use the storage as needed.

Previously all underlying PVs have been defined in manifests and the following PVCs will be using them.

Note: 
If you don't create the underlying PVs, Rancher will automatically create them for you based on the storage class and 
the requested size. This allows for dynamic provisioning of storage resources in the cluster.

## Caddy conf PVC (optional)

This is the Persistent Volume Claim (PVC) for the Caddy configuration files. It is used to store the configuration files 
for the Caddy web server, which is part of the Magic Frame application. The PVC ensures that the configuration files are 
persisted across pod restarts and can be shared between different pods if needed.

Copy and past the below YAML code into a YAML  file named ```magic-frame-caddy-conf-pvc.yaml```
```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-caddy-conf-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```

## Caddy config PVC (optional)

The Persistent Volume Claim (PVC) for additional Caddy configuration files is defined below. 

Copy and past the below YAML code into a YAML  file named ```magic-frame-caddy-config-pvc.yaml```

```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-caddy-config-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```
## Caddy data PVC

This PVC is used for storing the data files for the Caddy web server.

Copy and past the below YAML code into a YAML  file named ```magic-frame-caddy-data-pvc.yaml```
```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-caddy-data-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```
## Magic Frame configs PVC

Used for storing the configuration files for the Magic Frame application.

Copy and past the below YAML code into a YAML file named ```magic-frame-configs-pvc.yaml```
```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-configs-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```
## Postgres database PVC

This PVC used for storing the data files for the PostgreSQL database, which is part of the Magic Frame application. 
This PVC ensures that the database data is persisted across pod restarts and can be shared between different pods if
needed.

Copy and past the below YAML code into a YAML file named ```magic-frame-pgdata-pvc.yaml```
```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-pgdata-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi

```
## Wallpaper PVC

The Persistent Volume Claim (PVC) for storing wallpaper images used by the Magic Frame application.

Copy and past the below YAML code into a YAML file named ```magic-frame-wallpapers-pvc.yaml```
```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: magic-frame-wallpapers-pvc
  namespace: magic-frame
spec:
  storageClassName: magic-frame-storage
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```