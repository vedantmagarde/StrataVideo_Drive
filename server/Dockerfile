FROM node:20-bullseye

# Install dependencies: ffmpeg for video encoding/decoding, python3 and pip for yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp via pip3 (busting the Docker cache)
RUN pip3 install --upgrade yt-dlp

# Create manual symlink for python
RUN ln -s /usr/bin/python3 /usr/bin/python || true

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
