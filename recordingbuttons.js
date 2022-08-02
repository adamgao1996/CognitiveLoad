import { Amplify, Storage} from 'aws-amplify';
import awsconfig from './aws-exports';
Amplify.configure(awsconfig);

const recordAudio = () =>
    new Promise(async resolve => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    const start = () => {
        audioChunks = [];
        mediaRecorder.start();
    };

    const stop = () =>
        new Promise(resolve => {
        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            const play = () => audio.play();
            resolve({ audioChunks, audioBlob, audioUrl, play });
        });

        mediaRecorder.stop();
        });

    resolve({ start, stop });
    });

//  const play = (frequency = 300, duration = 1e3) => {
// 	const context = new AudioContext();
// 	const gainNode = context.createGain();
// 	const oscillator = context.createOscillator();
// 	oscillator.frequency.value = frequency;
// 	oscillator.connect(gainNode);
// 	gainNode.connect(context.destination);
// 	oscillator.start(0);
// 	setTimeout(() => oscillator.stop(), duration);
// 	};

const soundControl = (frequency = 300) =>
    new Promise(async resolve=>{
    const context = new AudioContext();
    const gainNode = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    const start = () => {
        oscillator.start(0);
    };

    const stop = () =>{
        oscillator.stop()
    }

    resolve({ start, stop });
    })
    
                
const sleep = time => new Promise(resolve => setTimeout(resolve, time));

const recordButton = document.querySelector('#record');
const stopButton = document.querySelector('#stop');
const playButton = document.querySelector('#play');
const saveButton = document.querySelector('#save');
const soundStartButton = document.querySelector('#soundstart');
const soundStopButton = document.querySelector('#soundend')

const savedAudioMessagesContainer = document.querySelector('#saved-audio-messages');

let recorder;
let audio;
let sound;

soundStartButton.addEventListener('click', async () => {
    if(!sound){
    sound = await soundControl(18000);
    }
    soundStartButton.setAttribute('disabled', true);
    soundStopButton.removeAttribute('disabled');
    sound.start();
    // play();
});

soundStopButton.addEventListener('click', async () => {
    soundStopButton.setAttribute('disabled', true);
    soundStartButton.removeAttribute('disabled');
    sound.stop();
    sound = null;
});

recordButton.addEventListener('click', async () => {
    recordButton.setAttribute('disabled', true);
    stopButton.removeAttribute('disabled');
    playButton.setAttribute('disabled', true);
    saveButton.setAttribute('disabled', true);
    if (!recorder) {
    recorder = await recordAudio();
    }
    recorder.start();
});

stopButton.addEventListener('click', async () => {
    recordButton.removeAttribute('disabled');
    stopButton.setAttribute('disabled', true);
    playButton.removeAttribute('disabled');
    saveButton.removeAttribute('disabled');
    audio = await recorder.stop();
});

playButton.addEventListener('click', () => {
    audio.play();
});

saveButton.addEventListener('click', () => {
    const reader = new FileReader();
    reader.readAsDataURL(audio.audioBlob);
    reader.onload = () => {
    const base64AudioMessage = reader.result.split(',')[1];

    fetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: base64AudioMessage })
    }).then(res => {
        if (res.status === 201) {
        return populateAudioMessages();
        }
        console.log('Invalid status saving audio message: ' + res.status);
    });

    Storage.put(audio,"userrecording")
        .then(item => {
            console.log(item)
        })
        .catch(err => console.error(err))
    };
});

const populateAudioMessages = () => {
    return fetch('/messages').then(res => {
    if (res.status === 200) {
        return res.json().then(json => {
        json.messageFilenames.forEach(filename => {
            let audioElement = document.querySelector(`[data-audio-filename="${filename}"]`);
            if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.src = `/messages/${filename}`;
            audioElement.setAttribute('data-audio-filename', filename);
            audioElement.setAttribute('controls', true);
            savedAudioMessagesContainer.appendChild(audioElement);
            }
        });
        });
    }
    console.log('Invalid status getting messages: ' + res.status);
    });
};

populateAudioMessages();