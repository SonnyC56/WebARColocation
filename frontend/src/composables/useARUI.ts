import { ref, type Ref } from 'vue';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Button, Control } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';

export interface DebugInfo {
  webxrSupported: boolean;
  arActive: boolean;
  trackingInitialized: boolean;
  anchorFound: boolean;
  networkConnected: boolean;
  roomId: string | null;
  objectCount: number;
  lastError: string | null;
}

export function useARUI(scene: Ref<Scene | null>) {
  const advancedTexture = ref<AdvancedDynamicTexture | null>(null);
  const showDebug = ref(false);
  
  // UI elements
  const debugPanel = ref<Rectangle | null>(null);
  const statusBar = ref<Rectangle | null>(null);
  const centerInstruction = ref<Rectangle | null>(null);
  const controlsPanel = ref<Rectangle | null>(null);
  const flashOverlay = ref<Rectangle | null>(null);
  
  // Audio context for sound
  let audioContext: AudioContext | null = null;

  // Initialize GUI
  const initializeGUI = (): boolean => {
    if (!scene.value) {
      console.error('Scene not available for GUI');
      return false;
    }

    try {
      // Create fullscreen UI texture - don't set idealWidth/Height to avoid scaling issues
      advancedTexture.value = AdvancedDynamicTexture.CreateFullscreenUI('ARUI', true, scene.value);
      
      // Create UI elements
      createStatusBar();
      createControlsPanel();
      createCenterInstruction();
      createDebugPanel();
      createFlashOverlay();
      
      // Initialize audio context for sound
      initAudio();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize GUI:', error);
      return false;
    }
  };

  const createStatusBar = () => {
    if (!advancedTexture.value) return;

    // Compact status bar at top center
    const bar = new Rectangle('statusBar');
    bar.width = '0.35'; // 35% of screen width
    bar.height = '60px';
    bar.cornerRadius = 8;
    bar.color = 'rgba(255,255,255,0.2)';
    bar.thickness = 2;
    bar.background = 'rgba(0,0,0,0.75)';
    bar.alpha = 0.9;
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    bar.top = '20px';
    bar.paddingTop = '8px';
    bar.paddingBottom = '8px';
    bar.paddingLeft = '16px';
    bar.paddingRight = '16px';
    advancedTexture.value.addControl(bar);
    statusBar.value = bar;
  };

  const updateStatusBar = (roomId: string, participantCount: number, anchorFound: boolean) => {
    if (!statusBar.value) return;

    // Clear existing content
    Array.from(statusBar.value.children).forEach((child) => {
      statusBar.value!.removeControl(child as Control);
    });

    // Create horizontal layout with three items
    const container = new Rectangle('statusContainer');
    container.width = '100%';
    container.height = '100%';
    container.thickness = 0;
    container.background = 'transparent';
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    statusBar.value.addControl(container);

    const createStatusItem = (label: string, value: string, color: string = 'white') => {
      const item = new Rectangle(`statusItem_${label}`);
      item.width = '0.3'; // 30% of container width
      item.height = '100%';
      item.background = 'transparent';
      item.thickness = 0;
      item.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      container.addControl(item);

      const labelText = new TextBlock(`statusLabel_${label}`, label);
      labelText.color = 'rgba(255,255,255,0.8)';
      labelText.fontSize = 11;
      labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      labelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      item.addControl(labelText);

      const valueText = new TextBlock(`statusValue_${label}`, value);
      valueText.color = color;
      valueText.fontSize = 16;
      valueText.fontWeight = 'bold';
      valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      valueText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      valueText.top = '20px';
      item.addControl(valueText);
    };

    createStatusItem('Room', roomId.substring(0, 6) || 'None');
    createStatusItem('Users', participantCount.toString());
    createStatusItem('Anchor', anchorFound ? '✓' : '✗', anchorFound ? '#4ade80' : '#fbbf24');
  };

  const createControlsPanel = () => {
    if (!advancedTexture.value) return;

    const panel = new Rectangle('controlsPanel');
    panel.width = '0.85'; // 85% of screen width
    panel.height = '70px';
    panel.cornerRadius = 12;
    panel.color = 'rgba(255,255,255,0.2)';
    panel.thickness = 2;
    panel.background = 'rgba(0,0,0,0.75)';
    panel.alpha = 0.9;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.top = '-100px'; // Negative top for bottom alignment
    panel.paddingTop = '12px';
    panel.paddingBottom = '12px';
    panel.paddingLeft = '16px';
    panel.paddingRight = '16px';
    advancedTexture.value.addControl(panel);
    controlsPanel.value = panel;
  };

  const createButton = (name: string, text: string, onClick: () => void, color: string = '#667eea', enabled: boolean = true): Button => {
    const button = Button.CreateSimpleButton(name, text);
    button.width = '0.28'; // 28% of panel width
    button.height = '46px';
    button.color = 'white';
    button.fontSize = 16;
    button.fontWeight = 'bold';
    button.background = color;
    button.cornerRadius = 8;
    button.alpha = enabled ? 1 : 0.5;
    button.isEnabled = enabled;
    button.thickness = 0;
    button.onPointerClickObservable.add(() => {
      if (enabled) {
        onClick();
      }
    });
    return button;
  };

  const updateControls = (onPlaceObject: () => void, onExitAR: () => void, onFocusCamera: () => void, anchorFound: boolean) => {
    if (!controlsPanel.value) return;

    // Clear existing buttons
    Array.from(controlsPanel.value.children).forEach((child) => {
      controlsPanel.value!.removeControl(child as Control);
    });

    // Create button container
    const buttonContainer = new Rectangle('buttonContainer');
    buttonContainer.width = '100%';
    buttonContainer.height = '100%';
    buttonContainer.thickness = 0;
    buttonContainer.background = 'transparent';
    controlsPanel.value.addControl(buttonContainer);

    const focusBtn = createButton('focusBtn', 'Focus', onFocusCamera, '#22c55e', true);
    focusBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    buttonContainer.addControl(focusBtn);

    const placeBtn = createButton('placeBtn', 'Place', onPlaceObject, '#667eea', anchorFound);
    placeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    buttonContainer.addControl(placeBtn);

    const exitBtn = createButton('exitBtn', 'Exit', onExitAR, '#ef4444', true);
    exitBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    buttonContainer.addControl(exitBtn);
  };

  const createCenterInstruction = () => {
    if (!advancedTexture.value) return;

    const instruction = new Rectangle('centerInstruction');
    instruction.width = '0.8'; // 80% of screen width
    instruction.height = 'auto';
    instruction.cornerRadius = 16;
    instruction.color = 'rgba(255,255,255,0.3)';
    instruction.thickness = 3;
    instruction.background = 'rgba(0,0,0,0.85)';
    instruction.alpha = 0.95;
    instruction.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    instruction.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    instruction.adaptHeightToChildren = true;
    instruction.paddingTop = '32px';
    instruction.paddingBottom = '32px';
    instruction.paddingLeft = '24px';
    instruction.paddingRight = '24px';
    instruction.isVisible = false;
    advancedTexture.value.addControl(instruction);
    centerInstruction.value = instruction;
  };

  const showCenterInstruction = (show: boolean, message?: string) => {
    if (!centerInstruction.value) return;
    
    centerInstruction.value.isVisible = show;
    
    if (show && message) {
      // Clear existing content
      Array.from(centerInstruction.value.children).forEach((child) => {
        centerInstruction.value!.removeControl(child as Control);
      });

      const title = new TextBlock('instructionTitle', 'Scan QR Code');
      title.color = 'white';
      title.fontSize = 28;
      title.fontWeight = 'bold';
      title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      title.paddingBottom = '16px';
      centerInstruction.value.addControl(title);

      const desc = new TextBlock('instructionDesc', message || 'Point your device at the QR marker to anchor the AR experience');
      desc.color = 'rgba(255,255,255,0.9)';
      desc.fontSize = 18;
      desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      desc.textWrapping = true;
      centerInstruction.value.addControl(desc);
    }
  };

  const createDebugPanel = () => {
    if (!advancedTexture.value) return;

    const panel = new Rectangle('debugPanel');
    panel.width = '0.4'; // 40% of screen width
    panel.height = 'auto';
    panel.cornerRadius = 8;
    panel.color = 'rgba(255,255,255,0.2)';
    panel.thickness = 2;
    panel.background = 'rgba(0,0,0,0.8)';
    panel.alpha = 0.9;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.left = '15px';
    panel.top = '100px';
    panel.adaptHeightToChildren = true;
    panel.paddingTop = '10px';
    panel.paddingBottom = '10px';
    panel.paddingLeft = '12px';
    panel.paddingRight = '12px';
    panel.isVisible = false;
    advancedTexture.value.addControl(panel);
    debugPanel.value = panel;

    // Header
    const header = new Rectangle('debugHeader');
    header.width = '100%';
    header.height = '32px';
    header.background = 'transparent';
    header.thickness = 0;
    header.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.addControl(header);

    const headerText = new TextBlock('debugHeaderText', 'DEBUG');
    headerText.color = 'white';
    headerText.fontSize = 14;
    headerText.fontWeight = 'bold';
    headerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    header.addControl(headerText);

    const toggleBtn = Button.CreateSimpleButton('debugToggle', '▲');
    toggleBtn.width = '32px';
    toggleBtn.height = '28px';
    toggleBtn.color = 'white';
    toggleBtn.fontSize = 14;
    toggleBtn.background = 'rgba(255,255,255,0.2)';
    toggleBtn.cornerRadius = 4;
    toggleBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    toggleBtn.onPointerClickObservable.add(() => {
      showDebug.value = !showDebug.value;
      toggleBtn.textBlock!.text = showDebug.value ? '▼' : '▲';
      updateDebugContent();
    });
    header.addControl(toggleBtn);

    // Debug content container
    const contentContainer = new Rectangle('debugContent');
    contentContainer.width = '100%';
    contentContainer.height = 'auto';
    contentContainer.background = 'transparent';
    contentContainer.thickness = 0;
    contentContainer.adaptHeightToChildren = true;
    panel.addControl(contentContainer);
    updateDebugContent();
  };

  const updateDebugContent = () => {
    if (!debugPanel.value) return;
    
    debugPanel.value.isVisible = showDebug.value;
    
    if (!showDebug.value) {
      return;
    }

    const content = advancedTexture.value?.getControlByName('debugContent') as Rectangle;
    if (!content) return;

    // Clear existing content
    Array.from(content.children).forEach((child) => {
      content.removeControl(child as Control);
    });
    content.isVisible = true;
  };

  const updateDebugInfo = (info: DebugInfo) => {
    if (!debugPanel.value || !showDebug.value) return;

    const content = advancedTexture.value?.getControlByName('debugContent') as Rectangle;
    if (!content) return;

    // Clear and recreate debug lines
    Array.from(content.children).forEach((child) => {
      if (child.name?.startsWith('debugLine')) {
        content.removeControl(child as Control);
      }
    });

    const createDebugLine = (label: string, value: string, color: string = 'white') => {
      const line = new Rectangle(`debugLine_${label}`);
      line.width = '100%';
      line.height = '24px';
      line.background = 'transparent';
      line.thickness = 0;
      line.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      line.paddingBottom = '3px';
      content.addControl(line);

      const labelText = new TextBlock(`debugLabel_${label}`, label + ':');
      labelText.color = 'rgba(255,255,255,0.8)';
      labelText.fontSize = 12;
      labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      labelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      labelText.width = '0.5'; // 50% of line width
      line.addControl(labelText);

      const valueText = new TextBlock(`debugValue_${label}`, value);
      valueText.color = color;
      valueText.fontSize = 12;
      valueText.fontWeight = '600';
      valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      valueText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      valueText.width = '0.45'; // 45% of line width
      line.addControl(valueText);
    };

    createDebugLine('WebXR', info.webxrSupported ? 'Yes' : 'No', info.webxrSupported ? '#4ade80' : '#f87171');
    createDebugLine('AR', info.arActive ? 'Active' : 'Inactive', info.arActive ? '#4ade80' : '#fbbf24');
    createDebugLine('Tracking', info.trackingInitialized ? 'Init' : 'No', info.trackingInitialized ? '#4ade80' : '#fbbf24');
    createDebugLine('Anchor', info.anchorFound ? 'Found' : 'None', info.anchorFound ? '#4ade80' : '#fbbf24');
    createDebugLine('Network', info.networkConnected ? 'On' : 'Off', info.networkConnected ? '#4ade80' : '#f87171');
    createDebugLine('Room', info.roomId || 'None');
    createDebugLine('Objects', info.objectCount.toString());
    
    if (info.lastError) {
      createDebugLine('Error', info.lastError.substring(0, 20), '#f87171');
    }
  };

  const createFlashOverlay = () => {
    if (!advancedTexture.value) return;

    const overlay = new Rectangle('flashOverlay');
    overlay.width = '100%';
    overlay.height = '100%';
    overlay.background = 'white';
    overlay.alpha = 0;
    overlay.thickness = 0;
    overlay.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    overlay.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    overlay.isPointerBlocker = false;
    overlay.zIndex = 1000;
    overlay.isVisible = true;
    advancedTexture.value.addControl(overlay);
    flashOverlay.value = overlay;
  };

  const initAudio = () => {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  };

  const playSuccessSound = () => {
    if (!audioContext) {
      initAudio();
      if (!audioContext) return;
    }

    try {
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime);
      
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator1.start();
      oscillator2.start();
      oscillator1.stop(audioContext.currentTime + 0.3);
      oscillator2.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  };

  const triggerFlash = () => {
    if (!flashOverlay.value || !advancedTexture.value || !scene.value) return;

    playSuccessSound();

    const flash = flashOverlay.value;
    flash.alpha = 0;
    
    let startTime: number | null = null;
    const duration = 300;
    
    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      
      const elapsed = timestamp - startTime;
      const progress = elapsed / duration;
      
      if (progress < 0.3) {
        flash.alpha = (progress / 0.3) * 0.8;
        requestAnimationFrame(animate);
      } else if (progress < 1.0) {
        flash.alpha = 0.8 * (1 - (progress - 0.3) / 0.7);
        requestAnimationFrame(animate);
      } else {
        flash.alpha = 0;
      }
    };
    
    requestAnimationFrame(animate);
  };

  const dispose = () => {
    if (advancedTexture.value) {
      advancedTexture.value.dispose();
      advancedTexture.value = null;
    }
    debugPanel.value = null;
    statusBar.value = null;
    centerInstruction.value = null;
    controlsPanel.value = null;
    flashOverlay.value = null;
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return {
    initializeGUI,
    updateDebugInfo,
    updateStatusBar,
    showCenterInstruction,
    updateControls,
    triggerFlash,
    dispose,
  };
}
