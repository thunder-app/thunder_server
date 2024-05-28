FROM node:latest

# Install wait-for-it
RUN apt-get update && apt-get install -y wait-for-it

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5100

# Wait for PostgreSQL to be ready and then start the Node.js server
CMD wait-for-it $POSTGRES_HOSTNAME:5432 -- npm start
