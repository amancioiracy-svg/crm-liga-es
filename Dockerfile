FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend and Express server
RUN npm run build

# Expose port and set production environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["npm", "start"]
