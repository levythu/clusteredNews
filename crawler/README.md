# clusteredNews: Web Crawler
Automatically fetch information from the Internet.

**NOTE: The component is distributed-designed. Hence multiple instances can be launched, and running on different servers is also safe.**

## Environment
- Nodejs
- npm

## How to deploy (On Ubuntu 14.04+)

#### Change working directory to `/crawler/`
```sh
cd crawler
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
