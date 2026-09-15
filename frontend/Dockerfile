FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# No build args: BACKEND_URL and BACKEND_API_KEY are read at runtime by the
# /api proxy route, so no secret is baked into the image or the bundle.
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]