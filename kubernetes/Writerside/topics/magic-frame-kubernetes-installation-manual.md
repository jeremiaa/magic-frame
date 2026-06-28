# Magic Frame on Kubernetes 
## Installation manual

This document describes how to install Magic Frame on Kubernetes.
It is assumed that you have some knowledge of Kubernetes, have a Kubernetes cluster up and running, and you have 
`kubectl` configured to interact with it.
This document tries to serve a wide audience. For some it might be still daunting, for some to broadly written.

## Step 1: Create a Namespace
First, create a namespace for Magic Frame. This can be any name, but must be consistent throughout the manifests. 
For the sake of this documentation we will use, surprisingly, "magic-frame".
```bash
kubectl create namespace magic-frame
```
## Step 2: Create a database secret REMOVE
Magic Frame requires a database to store its data. You need to create a secret to store the database credentials.
```bash
kubectl create secret generic magic-frame-db-secret \
  --from-literal=username=your_db_username \
  --from-literal=password=your_db_password \
  --from-literal=host=your_db_host \
  --from-literal=port=your_db_port \
  --namespace=magic-frame
```
Replace `your_db_username`, `your_db_password`, `your_db_host`, and `your_db_port` with your actual database credentials.
## Step 3: Create a "Session Secret" that will allow safe communication.
There are a number of ways to create and implement a secret (as in Step 2), in this case we will use a manual option as 
an example.

```
$ head -c 32 /dev/urandom | od -An -tx1 -v | tr -d ' \n'
```
Copy the secret and save it for now.

## Step 4: Deploy Magic Frame
Now, you can deploy Magic Frame using the manifests provided in this document.

Note:
Caddy can be used, but is optional. If you have your own ingress application running, you might want to use that.
You can skip all Caddy related manifests when using your own ingress. Also, the app manifests need to be slightly
adapted to support the no-Caddy option. No worry, the documentation will describe this clearly when applicable.

Note:
All separate manifests can be combined into 1 or more manifest. For example, all PC and PVC could be stored in 1 single 
manifest. This document uses separate files for each definition.
