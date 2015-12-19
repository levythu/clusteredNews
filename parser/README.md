# clusteredNews: HTML Parser
Parse the content from HTML files and generate term-document matrices.

**NOTE: The component is distributed-designed. Hence multiple instances can be launched, and running on different servers is also safe.**

## Environment
- Nodejs
- npm

## How to deploy (On Ubuntu 14.04+)

#### Change working directory to `/parser/`
```sh
cd parser
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
