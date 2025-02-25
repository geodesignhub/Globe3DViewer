FROM node:lts
RUN apt-get update && apt-get install -y \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

RUN chmod +x start.sh
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app

# Run the start script
CMD ["./start.sh"]