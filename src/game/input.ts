/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerInput {
  moveX: number;
  moveY: number;
  attackHeld: boolean;
  attackJustPressed: boolean;
  shieldHeld: boolean;
  spinHeld: boolean;
  dashJustPressed: boolean;
  potionJustPressed: boolean;
}

export class InputManager {
  // Key state tracking
  private keysHeld: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();

  // Mobile Virtual Controls State (for Player 1)
  public mobileJoystick: { x: number; y: number } = { x: 0, y: 0 };
  public mobileAttackHeld: boolean = false;
  public mobileAttackJustPressed: boolean = false;
  public mobileShieldHeld: boolean = false;
  public mobileSpinHeld: boolean = false;
  public mobileDashJustPressed: boolean = false;
  public mobilePotionJustPressed: boolean = false;

  private isBound: boolean = false;

  public init() {
    if (this.isBound) return;
    this.isBound = true;

    window.addEventListener('keydown', (e) => {
      // Avoid scrolling on game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keysHeld.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysHeld.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
      // Keep mobileJoystick independent of blur so dragging doesn't reset prematurely
    });
  }

  // Get sanitized input vector and edge triggers for Single Player Hero
  public getPlayerInput(_playerIndex: number = 0): PlayerInput {
    // 1. Read Gamepads
    const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    let moveX = 0;
    let moveY = 0;

    // Keyboard WASD or Arrow Keys
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveY -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveY += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;

    // Mobile joystick override / combine
    if (Math.abs(this.mobileJoystick.x) > 0.05 || Math.abs(this.mobileJoystick.y) > 0.05) {
      moveX = this.mobileJoystick.x;
      moveY = this.mobileJoystick.y;
    }

    // Gamepad override / combine
    if (gp && gp.connected) {
      const gpX = gp.axes[0];
      const gpY = gp.axes[1];
      if (Math.hypot(gpX, gpY) > 0.15) {
        moveX = gpX;
        moveY = gpY;
      }
    }

    // Normalize diagonal keyboard speed
    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    const gpAttack = gp ? (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) : false;
    const gpShield = gp ? (gp.buttons[4]?.pressed || gp.buttons[6]?.pressed || gp.buttons[5]?.pressed) : false;
    const gpDash = gp ? gp.buttons[1]?.pressed : false;
    const gpPotion = gp ? gp.buttons[3]?.pressed : false;

    const attackHeld = this.keysHeld.has('Space') || this.keysHeld.has('KeyJ') || this.keysHeld.has('Enter') || this.mobileAttackHeld || gpAttack;
    const attackJustPressed = this.keysJustPressed.has('Space') || this.keysJustPressed.has('KeyJ') || this.keysJustPressed.has('Enter') || this.mobileAttackJustPressed;
    const shieldHeld = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.keysHeld.has('KeyK') || this.mobileShieldHeld || gpShield;
    const spinHeld = this.keysHeld.has('KeyQ') || this.mobileSpinHeld;
    const dashJustPressed = this.keysJustPressed.has('KeyE') || this.mobileDashJustPressed || gpDash;
    const potionJustPressed = this.keysJustPressed.has('Digit1') || this.keysJustPressed.has('KeyH') || this.mobilePotionJustPressed || gpPotion;

    return {
      moveX,
      moveY,
      attackHeld,
      attackJustPressed,
      shieldHeld,
      spinHeld,
      dashJustPressed,
      potionJustPressed,
    };
  }

  // End of frame cleanup of edge triggers
  public endFrame() {
    this.keysJustPressed.clear();
    this.mobileAttackJustPressed = false;
    this.mobileDashJustPressed = false;
    this.mobilePotionJustPressed = false;
  }
}

export const inputManager = new InputManager();
