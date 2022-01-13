FROM node:16.8-bullseye

RUN mkdir -p /app

WORKDIR /app

# update npm
RUN npm install -g npm

# install TypeScript
RUN npm install -g typescript

# general package
RUN npm install -g node-gyp

# deploy commands
# RUN node deploy-commands.js

CMD ["/bin/bash"]