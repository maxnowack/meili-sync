FROM node as build
WORKDIR /app
COPY package-lock.json package-lock.json
COPY package.json package.json
RUN npm install --no-audit
COPY . .
RUN npm run build

FROM node:alpine
ENV NODE_ENV production

WORKDIR /app
COPY --from=build /app/package-lock.json /app/package-lock.json
COPY --from=build /app/package.json /app/package.json
RUN npm install --production --no-audit
COPY --from=build /app/dist /app/dist

CMD ["npm", "start"]
