FROM python:3.10-slim

# Install Node.js for JavaScript execution
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install common Python packages
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    matplotlib \
    requests \
    fastapi \
    flask

# Create a non-root user to run code
RUN useradd -m -u 1000 coder
USER coder

# Set up working directory
WORKDIR /workspace

# Copy the execution script
COPY --chown=coder:coder run.sh /home/coder/run.sh
RUN chmod +x /home/coder/run.sh

# Set entrypoint
ENTRYPOINT ["/home/coder/run.sh"]
