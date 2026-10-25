/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
      this.startAmbientMusic();
    } catch {
      // Audio not permitted yet or unsupported
    }
  }

  public ensureResume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Sword Swing: crisp white noise with filter sweep + quick pitch drop
  public playSwordSwing() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.14);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Spin Attack Whirl: Zelda 3 style 360 whirlwind sonic slice
  public playSpinAttack() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280 + i * 140, t + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(700 + i * 220, t + 0.2 + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.38 + i * 0.05);

      gain.gain.setValueAtTime(0.4, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38 + i * 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + 0.45);
    }
  }

  // Spin Charge hum (continuous rising tension)
  public playSpinCharge(intensity: number) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200 + intensity * 350, t);
    osc.frequency.linearRampToValueAtTime(240 + intensity * 380, t + 0.08);

    gain.gain.setValueAtTime(0.15 * Math.min(1, intensity + 0.2), t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Shield Block: metallic resonance clang with high ping
  public playShieldBlock() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    
    // Low heavy thud
    const oscLow = this.ctx.createOscillator();
    const gainLow = this.ctx.createGain();
    oscLow.type = 'triangle';
    oscLow.frequency.setValueAtTime(140, t);
    oscLow.frequency.exponentialRampToValueAtTime(50, t + 0.18);
    gainLow.gain.setValueAtTime(0.6, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    oscLow.connect(gainLow);
    gainLow.connect(this.masterGain);
    oscLow.start(t);
    oscLow.stop(t + 0.2);

    // High metallic ping ringing
    const oscHigh = this.ctx.createOscillator();
    const gainHigh = this.ctx.createGain();
    oscHigh.type = 'sine';
    oscHigh.frequency.setValueAtTime(1850, t);
    oscHigh.frequency.exponentialRampToValueAtTime(1200, t + 0.28);
    gainHigh.gain.setValueAtTime(0.5, t);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    oscHigh.connect(gainHigh);
    gainHigh.connect(this.masterGain);
    oscHigh.start(t);
    oscHigh.stop(t + 0.32);
  }

  // Fleshy Hit: wet impact with gore splatter
  public playHitFlesh() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.16);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Visceral Gore Dismemberment / Severed Limb Bone Snap
  public playDismemberGore() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    // Bone snap crunch
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(320, t);
    snapOsc.frequency.setValueAtTime(95, t + 0.04);
    snapGain.gain.setValueAtTime(0.6, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    snapOsc.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapOsc.start(t);
    snapOsc.stop(t + 0.24);

    // Viscous squelch
    const goreOsc = this.ctx.createOscillator();
    const goreGain = this.ctx.createGain();
    goreOsc.type = 'sine';
    goreOsc.frequency.setValueAtTime(480, t + 0.02);
    goreOsc.frequency.exponentialRampToValueAtTime(70, t + 0.28);
    goreGain.gain.setValueAtTime(0.5, t + 0.02);
    goreGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    goreOsc.connect(goreGain);
    goreGain.connect(this.masterGain);
    goreOsc.start(t + 0.02);
    goreOsc.stop(t + 0.3);
  }

  // Slime Burst
  public playSlimeBurst() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Dash / Dodge Roll whoosh
  public playDash() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Diablo Loot Drop Chime: crystal chime based on rarity
  public playLootDrop(rarity: 'common' | 'magic' | 'rare' | 'legendary' | 'mythic') {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const freqs: Record<string, number[]> = {
      common: [520, 650],
      magic: [587, 880],
      rare: [659, 987, 1318],
      legendary: [523, 784, 1046, 1568],
      mythic: [440, 659, 880, 1320, 1760],
    };

    const notes = freqs[rarity] || freqs.common;
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = rarity === 'mythic' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      const dur = rarity === 'legendary' || rarity === 'mythic' ? 0.6 : 0.35;
      gain.gain.setValueAtTime(0.3, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + dur);
    });
  }

  // Level Up Fanfare
  public playLevelUp() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const melody = [392, 523, 659, 784, 1046];
    melody.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.1);
      gain.gain.setValueAtTime(0.4, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + (i === melody.length - 1 ? 0.8 : 0.2));
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.9);
    });
  }

  // Potion Drink / Heal
  public playPotion() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(640, t + 0.2);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.27);
  }

  // Player Hurt Grunt
  public playPlayerHurt() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.16);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Deep Subterranean Stairs Descent Rumble & Tone
  public playStairsDescent() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    this.ensureResume();

    const t = this.ctx.currentTime;
    // Deep stone rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.65);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.72);

    // Eerie descending overtone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(240, t);
    osc2.frequency.exponentialRampToValueAtTime(55, t + 0.8);
    gain2.gain.setValueAtTime(0.28, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.9);
  }

  // Ambient Dark Dungeon Synthesizer Drone
  private startAmbientMusic() {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // Low ominous drone
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'triangle';
      this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

      // Minor haunting fifth harmonic
      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(82.4, this.ctx.currentTime); // Low E

      this.ambientOsc1.connect(this.ambientGain);
      this.ambientOsc2.connect(this.ambientGain);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
    } catch {
      // Ignore background audio errors
    }
  }
}

export const soundEngine = new SoundEngine();
