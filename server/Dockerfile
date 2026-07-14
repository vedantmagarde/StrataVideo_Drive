FROM node:20-bullseye

# Install dependencies: ffmpeg for video encoding/decoding, python3 and pip for yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip3
RUN pip3 install yt-dlp

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install node modules
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
