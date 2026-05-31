import { Howl } from "howler";

interface WindowWithWebAudio extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

interface SyntheticSoundConfig {
  frequency: number;
  duration: number;
  volume: number;
  type: OscillatorType;
}

export class AudioManager {
  private static instance: AudioManager | null = null;

  private readonly sounds = new Map<string, Howl>();
  private audioContext: AudioContext | null = null;

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }

    return AudioManager.instance;
  }

  public registerWeaponSound(soundName: string, src: string, volume = 0.6): void {
    if (this.sounds.has(soundName)) {
      return;
    }

    this.sounds.set(
      soundName,
      new Howl({
        src: [src],
        volume,
        preload: true,
        html5: false
      })
    );
  }

  public playWeaponSound(soundName: string): void {
    const sound = this.sounds.get(soundName);

    if (sound?.state() === "loaded") {
      sound.play();
      return;
    }

    this.playSyntheticSound(soundName);
  }

  private constructor() {}

  private playSyntheticSound(soundName: string): void {
    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    const config = this.getSyntheticConfig(soundName);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(80, config.frequency * 0.55),
      now + config.duration
    );

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration);
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const browserWindow = window as WindowWithWebAudio;
    const AudioContextConstructor = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    this.audioContext = new AudioContextConstructor();

    return this.audioContext;
  }

  private getSyntheticConfig(soundName: string): SyntheticSoundConfig {
    switch (soundName) {
      case "shoot":
        return { frequency: 620, duration: 0.08, volume: 0.18, type: "square" };
      case "equip":
        return { frequency: 320, duration: 0.12, volume: 0.12, type: "triangle" };
      case "scream":
        return { frequency: 880, duration: 0.1, volume: 0.14, type: "sawtooth" };
      default:
        return { frequency: 440, duration: 0.08, volume: 0.12, type: "sine" };
    }
  }
}
