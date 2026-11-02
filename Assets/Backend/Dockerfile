FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
COPY --chown=node:node server.mjs package.json ./
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
