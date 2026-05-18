class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer     = [];
    this._bufferSize = 4000; //4000 audio samples collect karega before sending.
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    for (let i = 0; i < samples.length; i++) {
      this._buffer.push(samples[i]);
    }

    while (this._buffer.length >= this._bufferSize) {
      const chunk = this._buffer.splice(0, this._bufferSize);

      // Convert Float32 [-1, 1] to Int16 PCM
      const pcm16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const clamped = Math.max(-1, Math.min(1, chunk[i]));
        pcm16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
      }

      this.port.postMessage({ pcm: pcm16.buffer }, [pcm16.buffer]);
    }

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);