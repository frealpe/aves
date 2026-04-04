import { useEffect, useState, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';

const dsp = require('dsp.js');

export const useMicrophoneFFT = (enabled, fftSize = 1024) => {
    const [features, setFeatures] = useState({ 
        amplitude: 0, 
        dominant_freq: 0, 
        centroid: 0,
        bands: new Array(16).fill(0) // 16 bandas para la malla nodal
    });
    const isRecording = useRef(false);

    useEffect(() => {
        let streamStarted = false;

        const startMic = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            }

            const sampleRate = 44100;
            const options = {
                sampleRate,
                channels: 1,
                bitsPerSample: 16,
                audioSource: 1,
                bufferSize: fftSize
            };

            LiveAudioStream.init(options);

            try {
                const fft = new dsp.FFT(fftSize, sampleRate);

                LiveAudioStream.on('data', data => {
                    const chunk = Buffer.from(data, 'base64');
                    const floats = new Float32Array(fftSize);
                    let rms = 0;
                    
                    const maxLen = Math.min(chunk.length / 2, fftSize);
                    for (let i = 0; i < maxLen; i++) {
                        const int16 = chunk.readInt16LE(i * 2); 
                        const float = int16 / 32768.0;
                        floats[i] = float;
                        rms += float * float;
                    }
                    rms = Math.sqrt(rms / maxLen);

                    fft.forward(floats);
                    const spectrum = fft.spectrum; 

                    let maxMag = 0;
                    let domIdx = 0;
                    let num = 0;
                    let den = 0;

                    // Agrupar en 16 bandas logarítmicas (mejor para visualización de audio)
                    const numBands = 16;
                    const bands = new Float32Array(numBands);
                    const binsPerBand = Math.floor(spectrum.length / numBands);

                    for (let i = 0; i < spectrum.length; i++) {
                        const mag = spectrum[i];
                        if (mag > maxMag) {
                            maxMag = mag;
                            domIdx = i;
                        }
                        num += i * mag;
                        den += mag;

                        // Sumar a la banda correspondiente
                        const bandIdx = Math.min(Math.floor(i / binsPerBand), numBands - 1);
                        bands[bandIdx] += mag;
                    }
                    
                    // Normalización y suavizado de bandas
                    for (let b = 0; b < numBands; b++) {
                        bands[b] = (bands[b] / binsPerBand) * 100; // Escala visual básica
                    }

                    if (Math.random() < 0.01) {
                         console.log(`[useMicrophoneFFT] Stream activo. Banda Máx: ${Math.max(...bands).toFixed(2)}`);
                    }

                    const binWidth = sampleRate / fftSize;
                    setFeatures({
                        amplitude: rms * 3000,
                        dominant_freq: domIdx * binWidth,
                        centroid: den > 0 ? (num / den * binWidth) / (sampleRate / 2) : 0,
                        bands: Array.from(bands)
                    });
                });

                LiveAudioStream.start();
                streamStarted = true;
                isRecording.current = true;
            } catch (e) {
                console.error("[Mic] Error:", e);
            }
        };

        if (enabled && !isRecording.current) {
            startMic();
        } else if (!enabled && isRecording.current) {
            LiveAudioStream.stop();
            isRecording.current = false;
        }

        return () => {
             if (streamStarted) {
                 LiveAudioStream.stop();
                 isRecording.current = false;
             }
        };
    }, [enabled, fftSize]);

    return features;
};

export default useMicrophoneFFT;
