# clusteredNews: DB Cruiser
Periodically scan the database to find all the out-dated, out-locked and temporarily broken records

**NOTE: Unlike other components, Cruiser is designed to run in single-point. It is strongly recommended to deploy it on the same server with MongoDB, or the gate server for Mongo Cluster.**

## Environment
- Nodejs
- npm

## How to deploy (On Ubuntu 14.04+)

#### Change working directory to `/cruiser/`
```sh
cd cruiser
```
#### Installing dependencies, administrative privilege may be granted
```sh
sudo npm install
```

#### Modify the configuration and set db location, etc.
Note that existing settings are available for modifying, but not for removing.

```sh
vim conf/configure.js
```

#### Run the looping job in the background
```sh
nohup node kernel/entry.js &
```

#### OR Run the job once
```sh
node kernel/once.js
```
