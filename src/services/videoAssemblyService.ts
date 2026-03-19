export const concatVideos = async (
  scenes: { videoUrl: string; audioUrl?: string }[],
  onProgress?: (p: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (!scenes || scenes.length === 0) {
        reject(new Error('No videos to concatenate'));
        return;
      }

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.style.display = 'none';
      document.body.appendChild(video);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not supported'));
        return;
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      
      // Use the video element itself as the audio source for better synchronization
      const sourceNode = audioCtx.createMediaElementSource(video);
      sourceNode.connect(dest);
      sourceNode.connect(audioCtx.destination); // Also connect to destination so we can hear it while assembling

      let currentIdx = 0;
      const chunks: Blob[] = [];
      let recorder: MediaRecorder | null = null;
      let stream: MediaStream | null = null;
      let animationFrameId: number | null = null;
      let isRecording = false;

      const drawFrame = () => {
        if (isRecording && !video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        animationFrameId = requestAnimationFrame(drawFrame);
      };

      const cleanup = () => {
        try {
          isRecording = false;
          if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
          if (recorder && recorder.state !== 'inactive') recorder.stop();
          if (stream) stream.getTracks().forEach(t => t.stop());
          video.pause();
          video.removeAttribute('src');
          video.load();
          if (video.parentNode) video.parentNode.removeChild(video);
          
          if (audioCtx.state !== 'closed') audioCtx.close();
        } catch (e) {
          console.error('Cleanup error', e);
        }
      };

      video.onended = () => {
        currentIdx++;
        if (onProgress) onProgress(currentIdx / scenes.length);
        
        if (currentIdx < scenes.length) {
          video.src = scenes[currentIdx].videoUrl;
          video.play().catch(e => {
            cleanup();
            reject(new Error(`Failed to play video ${currentIdx + 1}: ${e.message}`));
          });
        } else {
          isRecording = false;
          if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
          } else {
            cleanup();
            resolve('');
          }
        }
      };

      video.onloadedmetadata = () => {
        if (!recorder) {
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // @ts-ignore
            stream = canvas.captureStream ? canvas.captureStream(30) : canvas.mozCaptureStream(30);
            if (!stream) {
              cleanup();
              reject(new Error('captureStream not supported in this browser'));
              return;
            }
            
            dest.stream.getAudioTracks().forEach(track => stream!.addTrack(track));
            
            const mimeTypes = [
              'video/mp4',
              'video/webm;codecs=h264,opus',
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm'
            ];
            
            let options: MediaRecorderOptions = {};
            for (const mimeType of mimeTypes) {
              if (MediaRecorder.isTypeSupported(mimeType)) {
                options = { mimeType, videoBitsPerSecond: 8000000 };
                console.log('Selected MIME type:', mimeType);
                break;
              }
            }
            
            recorder = new MediaRecorder(stream, options);
            
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) chunks.push(e.data);
            };
            
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: recorder?.mimeType || 'video/webm' });
              cleanup();
              resolve(URL.createObjectURL(blob));
            };
            
            recorder.start(100);
            isRecording = true;
            drawFrame();
          } catch (e: any) {
            cleanup();
            reject(new Error(`Failed to start recording: ${e.message}`));
          }
        }
      };

      video.onerror = () => {
        const errorMsg = video.error ? video.error.message : 'Unknown error';
        cleanup();
        reject(new Error(`Error loading video ${currentIdx + 1}: ${errorMsg}`));
      };

      video.src = scenes[0].videoUrl;
      video.muted = false; // Unmute so AudioContext can capture sound
      video.play().catch(e => {
        cleanup();
        reject(new Error(`Failed to play first video: ${e.message}`));
      });

    } catch (err: any) {
      reject(new Error(`Assembly failed: ${err.message}`));
    }
  });
};
