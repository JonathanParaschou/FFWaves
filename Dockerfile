FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev
COPY dist ./dist
COPY server ./server
COPY server.mjs ./
ENV PORT=4180
EXPOSE 4180
USER node
CMD ["node", "server.mjs"]
