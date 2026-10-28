import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;

export const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Set up logging
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  const baseURL = window.location.origin + '/ffmpeg';

  // Load ffmpeg.wasm using direct same-origin URLs instead of toBlobURL
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js?v=${Date.now()}`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm?v=${Date.now()}`,
  });
  
  return ffmpeg;
};

export const sanitizeVideo = async (file, options, onProgress) => {
  const fm = await loadFFmpeg();
  
  // Clean up previous files if any
  try {
    await fm.deleteFile('input.mp4');
    await fm.deleteFile('output.mp4');
  } catch (e) {
    // Ignore if files don't exist
  }

  // Set progress listener
  const progressHandler = ({ progress, time }) => {
    if (onProgress) {
      onProgress(progress * 100);
    }
  };
  fm.on('progress', progressHandler);

  // Write file to FFmpeg virtual file system
  await fm.writeFile('input.mp4', await fetchFile(file));

  // Build FFmpeg command based on options
  // -map_metadata -1 : Strips all global metadata
  // -y : Overwrite output files without asking
  let command = ['-y', '-i', 'input.mp4', '-map_metadata', '-1'];
  
  if (options.muteAudio) {
    // Drop audio track
    command.push('-an');
    command.push('-c:v', 'copy');
  } else if (options.pitchShift) {
    // Pitch shift audio while keeping video stream copied
    command.push('-c:v', 'copy');
    // Using asetrate and aresample to shift pitch by roughly -10% for deeper voice masking
    command.push('-af', 'asetrate=44100*0.8,aresample=44100,atempo=1/0.8');
  } else {
    // Fast metadata strip: copy both streams without re-encoding
    command.push('-c:v', 'copy', '-c:a', 'copy');
  }

  command.push('output.mp4');

  // Execute FFmpeg
  console.log('Running FFmpeg with command:', command.join(' '));
  const ret = await fm.exec(command);
  
  if (ret !== 0) {
    console.error('FFmpeg exec failed with code', ret);
    throw new Error(`FFmpeg processing failed with exit code ${ret}`);
  }

  // Read output file
  const data = await fm.readFile('output.mp4');
  
  // Clear progress listener
  fm.off('progress', progressHandler);

  // Create a Blob from the output data
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  return blob;
};
