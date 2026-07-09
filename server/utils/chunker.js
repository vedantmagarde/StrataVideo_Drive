const CHUNK_SIZE = 50 * 1024 * 1024; 

export const splitIntoChunks = (buffer) => {
    const chunks = [];
    let offset = 0;
    let chunkIndex = 0;

    while (offset < buffer.length) {
        const size = Math.min(CHUNK_SIZE, buffer.length - offset);
        const data = buffer.subarray(offset, offset + size);
        chunks.push({ chunkIndex, data });
        offset += size;
        chunkIndex++;
    }

    return chunks;
};

export const reassembleChunks = (chunks) => {
    
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const buffers = chunks.map(c => c.data);
    return Buffer.concat(buffers);
};
