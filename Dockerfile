FROM node:current-alpine3.12

ENV TZ=Asia/Ho_Chi_Minh

COPY src /
COPY assets /assets

RUN npm install

ENTRYPOINT ["node", "main.js"]
CMD []

